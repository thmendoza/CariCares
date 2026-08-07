import Groq from "groq-sdk";
import { db } from "@/lib/db";
import { getRubric } from "@/lib/ai/rubrics";
import { buildFullIepPrompt } from "@/lib/ai/prompts/full-iep-review";
import {
  overrideSeverity,
  SUGGESTED_TEXT_CATEGORIES,
  isBareGradeLevelMention,
} from "@/lib/ai/severity-classifier";
import { LAYERS } from "@/lib/ai/framework";
import type { IepSection, FlagSeverity, ReviewLayer, LayerStatus } from "@/app/generated/prisma/client";

interface RawFlag {
  layer: string;
  sectionType: string;
  category: string;
  highlightText: string;
  recommendation: string;
  suggestedText?: string | null;
  severity: string;
}

interface RawLayerFinding {
  layer: string;
  status: string;
  severity?: string | null;
  evidence_note?: string;
}

interface RawReviewResponse {
  flags?: RawFlag[];
  layer_findings?: RawLayerFinding[];
}

const CALL_TIMEOUT_MS = 60_000;
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Groq's free tier caps at 12,000 tokens/minute — a full IEP (rubric +
// instructions + every section) regularly runs ~14,000+ tokens in one
// request and gets rejected outright. Batch sections into smaller calls that
// individually fit, and space them out so a run of several batches in quick
// succession doesn't also blow the per-minute budget in aggregate.
const TPM_BUDGET = 12_000;
// Reserve headroom for the model's own output tokens (also drawn from the
// same per-minute budget) and for estimateTokens() being a rough approximation.
const OUTPUT_AND_SAFETY_MARGIN = 2_000;
const BATCH_DELAY_MS = 4_000;

// Rough chars-per-token approximation (~4 chars/token for English prose) —
// good enough for packing batches conservatively under budget, not an exact count.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SectionForPrompt {
  sectionType: string;
  sectionTitle: string;
  plainText: string;
}

// IepSection.plainText has all whitespace collapsed by the parser (no
// paragraph breaks survive), so the only reliable split point is a sentence
// boundary. Greedily accumulates sentences into chunks under the budget.
function splitIntoChunks(text: string, maxTokens: number): string[] {
  if (estimateTokens(text) <= maxTokens) return [text];
  const sentences = text.split(/(?<=[.?!])\s+(?=[A-Z0-9])/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && estimateTokens(candidate) > maxTokens) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Greedily packs sections (in document order) into batches whose FULL prompt
// (fixed overhead — rubric, framework layers, instructions — plus that
// batch's section content) stays under budget, so cross-section consistency
// checks still work within a batch — only split when a batch would overflow.
// maxContentTokens is measured dynamically from the real prompt rather than a
// hardcoded guess, since rubric/instruction text size varies by program and
// changes whenever the prompt copy is edited.
function batchSections(
  sections: SectionForPrompt[],
  maxContentTokens: number
): SectionForPrompt[][] {
  // A single section (e.g. a goals section with dozens of quarterly progress
  // narratives concatenated together) can itself exceed the whole batch
  // budget — no amount of between-section packing helps there. Split those
  // internally first, into same-typed pieces, before packing.
  const pieces: SectionForPrompt[] = [];
  for (const section of sections) {
    const chunks = splitIntoChunks(section.plainText, maxContentTokens);
    chunks.forEach((chunk, i) => {
      pieces.push({
        sectionType: section.sectionType,
        sectionTitle:
          chunks.length > 1 ? `${section.sectionTitle} (part ${i + 1}/${chunks.length})` : section.sectionTitle,
        plainText: chunk,
      });
    });
  }

  const batches: SectionForPrompt[][] = [];
  let current: SectionForPrompt[] = [];
  let currentTokens = 0;

  for (const piece of pieces) {
    const pieceTokens = estimateTokens(piece.plainText);
    if (current.length > 0 && currentTokens + pieceTokens > maxContentTokens) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(piece);
    currentTokens += pieceTokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function callGroq(groq: Groq, prompt: string): Promise<RawReviewResponse> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Groq timeout after 60s")), CALL_TIMEOUT_MS)
    );
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      timeout,
    ]);
    const text = (completion.choices[0]?.message?.content ?? "").trim();
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(clean) as RawReviewResponse;
  } catch (err) {
    console.error("[ai] callGroq error:", err instanceof Error ? err.message : err);
    return {};
  }
}

function findOffset(plainText: string, highlightText: string): { start: number; end: number } {
  const idx = plainText.indexOf(highlightText);
  if (idx === -1) return { start: 0, end: 0 };
  return { start: idx, end: idx + highlightText.length };
}

const VALID_LAYERS = new Set<string>(LAYERS.map((l) => l.key));
const VALID_SEVERITIES = new Set(["CRITICAL", "MAJOR", "MINOR", "SUGGESTION"]);
const VALID_STATUSES = new Set(["PASS", "NEEDS_REVIEW", "FAIL"]);

function normalizeEnum<T extends string>(raw: string | null | undefined, valid: Set<T>): T | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase() as T;
  return valid.has(upper) ? upper : null;
}

const STATUS_RANK: Record<LayerStatus, number> = { PASS: 0, NEEDS_REVIEW: 1, FAIL: 2 };
const SEVERITY_RANK: Record<FlagSeverity, number> = { SUGGESTION: 0, MINOR: 1, MAJOR: 2, CRITICAL: 3 };

interface MergedFinding {
  status: LayerStatus;
  severity: FlagSeverity | null;
  evidenceNotes: string[];
}

export async function runIepReview(iepId: string): Promise<void> {
  const iep = await db.iep.findUnique({
    where: { id: iepId },
    include: {
      sections: { orderBy: { order: "asc" } },
      student: {
        select: {
          program: true,
          enrolledGradeLevel: true,
          subjectLevels: { select: { subject: true, gradeLevel: true } },
        },
      },
    },
  });
  if (!iep) throw new Error(`IEP ${iepId} not found`);
  if (iep.sections.length === 0) throw new Error("IEP has no parsed sections");

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

  const rubric = getRubric(iep.student.program);
  const programLabel = iep.student.program ?? "FULL_INCLUSION_NO_SERVICES";

  const sectionsForPrompt = iep.sections.map((s) => ({
    sectionType: s.sectionType,
    sectionTitle: s.title,
    plainText: s.plainText,
  }));

  // Measure the actual fixed overhead (rubric + framework layers + academic
  // level block + instructions) for THIS review, rather than assuming a
  // constant — rubric length varies by program, and prompt copy changes over time.
  const overheadPrompt = buildFullIepPrompt({
    program: programLabel,
    rubric,
    enrolledGradeLevel: iep.student.enrolledGradeLevel,
    subjectLevels: iep.student.subjectLevels,
    sections: [],
  });
  const maxContentTokens =
    TPM_BUDGET - estimateTokens(overheadPrompt) - OUTPUT_AND_SAFETY_MARGIN;
  const batches = batchSections(sectionsForPrompt, maxContentTokens);

  // Call once per batch instead of once for the whole IEP — each batch stays
  // under Groq's per-request token budget; cross-section consistency checks
  // still work for sections that land in the same batch. Every call gets the
  // full 5-layer framework prompt (not split into separate layer passes) so
  // this stays at the same call-count/timing profile as before.
  const flags: RawFlag[] = [];
  const findingsByLayer = new Map<ReviewLayer, MergedFinding>();

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(BATCH_DELAY_MS);
    const prompt = buildFullIepPrompt({
      program: programLabel,
      rubric,
      enrolledGradeLevel: iep.student.enrolledGradeLevel,
      subjectLevels: iep.student.subjectLevels,
      sections: batches[i],
    });
    const { flags: batchFlags = [], layer_findings: batchFindings = [] } = await callGroq(groq, prompt);

    flags.push(...batchFlags.filter((f) => !isBareGradeLevelMention(f.highlightText)));

    for (const finding of batchFindings) {
      const layer = normalizeEnum(finding.layer, VALID_LAYERS as Set<ReviewLayer>);
      const status = normalizeEnum(finding.status, VALID_STATUSES as Set<LayerStatus>);
      if (!layer || !status) continue;
      const severity = normalizeEnum(finding.severity, VALID_SEVERITIES as Set<FlagSeverity>);
      const note = finding.evidence_note?.trim();

      const existing = findingsByLayer.get(layer);
      if (!existing) {
        findingsByLayer.set(layer, { status, severity, evidenceNotes: note ? [note] : [] });
      } else if (STATUS_RANK[status] > STATUS_RANK[existing.status]) {
        // Worse status wins as the layer's overall status, but keep prior evidence.
        findingsByLayer.set(layer, {
          status,
          severity:
            severity && (!existing.severity || SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity])
              ? severity
              : existing.severity,
          evidenceNotes: note ? [...existing.evidenceNotes, note] : existing.evidenceNotes,
        });
      } else {
        if (severity && (!existing.severity || SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity])) {
          existing.severity = severity;
        }
        if (note) existing.evidenceNotes.push(note);
      }
    }
  }

  // Build a lookup map: sectionType → IepSection
  const sectionByType = new Map<string, IepSection>(
    iep.sections.map((s) => [s.sectionType, s])
  );

  let totalFlags = 0;
  for (const flag of flags) {
    const layer = normalizeEnum(flag.layer, VALID_LAYERS as Set<ReviewLayer>);
    const rawSeverity = normalizeEnum(flag.severity, VALID_SEVERITIES as Set<FlagSeverity>);
    if (!layer || !rawSeverity) continue;

    const section =
      sectionByType.get(flag.sectionType) ??
      // Fallback: find section whose plainText contains the highlight
      iep.sections.find((s) => s.plainText.includes(flag.highlightText)) ??
      iep.sections[0];

    const finalSeverity = overrideSeverity(flag.category, rawSeverity);
    const flagStatus =
      finalSeverity === "CRITICAL" || finalSeverity === "MAJOR" ? "PENDING_COORDINATOR" : "VISIBLE_TO_TEACHER";
    const { start, end } = findOffset(section.plainText, flag.highlightText);
    // Don't trust the model to have honored "omit suggestedText otherwise" —
    // null it out server-side for any category that shouldn't carry one.
    const suggestedText = SUGGESTED_TEXT_CATEGORIES.has(flag.category)
      ? flag.suggestedText ?? null
      : null;

    await db.aiFlag.create({
      data: {
        iepId,
        sectionId: section.id,
        severity: finalSeverity,
        layer,
        status: flagStatus,
        category: flag.category,
        highlightStart: start,
        highlightEnd: end,
        highlightText: flag.highlightText,
        recommendation: flag.recommendation,
        suggestedText,
      },
    });
    totalFlags++;
  }

  // Every one of the 5 canonical layers gets a finding row — a layer with zero
  // reported findings across all batches defaults to NEEDS_REVIEW (per the
  // framework's own "when uncertain, label Needs Review rather than Pass"
  // rule), not to a silent Pass.
  for (const { key: layer } of LAYERS) {
    const merged = findingsByLayer.get(layer);
    await db.reviewLayerFinding.upsert({
      where: { iepId_layer: { iepId, layer } },
      create: {
        iepId,
        layer,
        status: merged?.status ?? "NEEDS_REVIEW",
        severity: merged?.severity ?? null,
        evidenceNote: merged?.evidenceNotes.length
          ? merged.evidenceNotes.join(" ")
          : "Not assessed — insufficient content reviewed for this layer.",
      },
      update: {
        status: merged?.status ?? "NEEDS_REVIEW",
        severity: merged?.severity ?? null,
        evidenceNote: merged?.evidenceNotes.length
          ? merged.evidenceNotes.join(" ")
          : "Not assessed — insufficient content reviewed for this layer.",
      },
    });
  }

  // Overall readiness: any critical failure means the IEP is at high risk of
  // missing something it can't function without; any other needs-review/fail
  // means it needs another pass; otherwise it's ready.
  const allFindings = Array.from(findingsByLayer.values());
  const hasCriticalFail = allFindings.some((f) => f.status === "FAIL" && f.severity === "CRITICAL");
  const hasAnyIssue = LAYERS.some((l) => (findingsByLayer.get(l.key)?.status ?? "NEEDS_REVIEW") !== "PASS");
  const overallReadiness = hasCriticalFail ? "HIGH_RISK_OF_OMISSION" : hasAnyIssue ? "NEEDS_REVISION" : "READY";

  const iepRecord = await db.iep.findUnique({
    where: { id: iepId },
    select: { uploadedById: true },
  });

  await db.iep.update({
    where: { id: iepId },
    data: { status: "IN_REVIEW", overallReadiness },
  });

  await db.actionHistory.create({
    data: {
      iepId,
      actorId: iepRecord!.uploadedById,
      actionType: "AI_REVIEW_COMPLETE",
      metadata: {
        flagCount: totalFlags,
        overallReadiness,
        layerStatuses: Object.fromEntries(
          LAYERS.map((l) => [l.key, findingsByLayer.get(l.key)?.status ?? "NEEDS_REVIEW"])
        ),
      },
    },
  });
}
