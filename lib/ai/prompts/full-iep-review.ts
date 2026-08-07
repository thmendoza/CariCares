import { LAYERS, SEVERITY_LEVELS, REVIEW_RULES } from "@/lib/ai/framework";

function formatLayerBlock(layer: (typeof LAYERS)[number]): string {
  const parts: string[] = [`### ${layer.name}\n${layer.purpose}`];

  if (layer.checkItems) parts.push(`Check items: ${layer.checkItems.join(", ")}`);
  if (layer.domains) parts.push(`Domains: ${layer.domains.join(", ")}`);
  if (layer.goalChecks) parts.push(`Goal checks: ${layer.goalChecks.join(", ")}`);
  if (layer.goalStructure) parts.push(`Expected goal structure: ${layer.goalStructure.join(", ")}`);
  if (layer.consistencyChecks) parts.push(`Consistency checks: ${layer.consistencyChecks.join(", ")}`);
  if (layer.evaluationQuestions) {
    parts.push(`Evaluation questions:\n${layer.evaluationQuestions.map((q) => `- ${q}`).join("\n")}`);
  }
  parts.push(`Common flags: ${layer.commonFlags.join("; ")}`);

  return parts.join("\n");
}

export function buildFullIepPrompt(params: {
  program: string;
  rubric: string;
  enrolledGradeLevel?: string | null;
  subjectLevels?: { subject: string; gradeLevel: string }[];
  sections: Array<{ sectionType: string; sectionTitle: string; plainText: string }>;
}): string {
  const sectionBlocks = params.sections
    .map(
      (s, i) =>
        `### Section ${i + 1}: ${s.sectionTitle} (${s.sectionType.replace(/_/g, " ")})\n${s.plainText}`
    )
    .join("\n\n");

  const subjectLevelLines = params.subjectLevels?.length
    ? params.subjectLevels.map((s) => `- ${s.subject}: ${s.gradeLevel}`).join("\n")
    : "No per-subject instructional levels recorded — assume all subjects match the enrolled grade level.";

  const layerBlocks = LAYERS.map(formatLayerBlock).join("\n\n");
  const severityBlock = SEVERITY_LEVELS.map((s) => `- ${s.label} (${s.level}): ${s.meaning}`).join("\n");
  const reviewRulesBlock = REVIEW_RULES.map((r) => `- ${r}`).join("\n");

  return `You are an expert Special Education (SPED) coordinator in the Philippines reviewing a draft IEP for individualized educational quality, developmental appropriateness, goal quality, intervention alignment, and internal consistency. This is a developmental and educational quality review, not a legal compliance audit — focus on whether the IEP meaningfully describes the child and supports instruction. Note: your job is to review the IEP, not to write or generate it.

## Student Program
${params.program.replace(/_/g, " ")}

## Program Quality Rubric
${params.rubric}

## Student Academic Level
Enrolled grade level: ${params.enrolledGradeLevel ?? "Not specified"}
Subject-specific instructional levels (e.g. for pull-out students who follow a different level in specific subjects):
${subjectLevelLines}

When evaluating academic goals, judge each goal against the student's INSTRUCTIONAL level for that specific subject (if recorded) rather than assuming the enrolled grade level applies uniformly. For example, a student enrolled in Grade 5 who is at a Grade 4 instructional level in Math should have Math goals evaluated against Grade 4 expectations, not Grade 5.

IMPORTANT: a pulled-out subject's stated grade level being LOWER than the student's enrolled grade level is the normal, correct, expected shape of a pull-out program — it is the entire reason this data exists. This is NEVER, by itself, an issue. Concrete example of what NOT to flag: document says "Pull Out (Reading, Language & Mathematics — Grade 1)" for a student enrolled in Grade 2 — that is CORRECT. Never create a flag whose "highlightText" is just a grade-level mention (e.g. "Grade 1", "Pull Out ... Grade 1") with no other substantive content. Only flag something here if the actual GOAL WORDING or PRESENT-LEVEL CONTENT contradicts the recorded instructional level for that specific subject — flag the mismatched content itself, never the grade-level labels.

## Review Framework

You are reviewing against 5 layers. For each layer, work through its check items/questions systematically before writing findings — check presence first, then quality.

${layerBlocks}

## Severity levels
${severityBlock}

## Review rules
${reviewRulesBlock}

Additionally, do NOT flag standard formal/institutional phrasing that fits an official school document's register as an issue. Phrases like "It is recommended that...", "It is determined that...", "The IEP Team determined that..." are conventional, appropriate, and preferred for this document type — passive voice used in formal administrative writing is correct here, not a quality problem. Never suggest rewriting this kind of formal phrasing into a more casual/active-voice alternative (e.g. never suggest "We recommend..." in place of "It is recommended that..."). Only flag writing that is genuinely hard to parse, confusing, redundant, or worded in a way that actually obscures its meaning — not simply because it uses formal or passive constructions. Writing-quality issues (grammar, clarity, duplicate_phrasing, formatting, word_choice, or awkward for awkwardly-structured-but-grammatical writing) can be flagged under any layer's category list using these category names, always at "minor" or "suggestion" severity, with "suggestedText" populated with the actual corrected/rewritten text (not a description of the fix).

## IEP Document
${sectionBlocks}

## Output format

Return a single JSON object (not an array) with exactly two top-level keys: "flags" and "layer_findings". Base your assessment only on the document content actually provided above — if a layer's relevant sections aren't shown in this batch, still report your best assessment from what IS shown, and prefer "needs_review" over "pass" when you can't fully evaluate a layer from the content given.

"flags": an array of JSON objects, one per issue found. Each object:
- "layer": which of the 5 layers this issue belongs to — one of: student_understanding, developmental_assessment, goal_quality, intervention_alignment, overall_consistency
- "sectionType": the section type string where the issue is found (use the exact type from the section header, e.g. "ANNUAL_GOALS")
- "category": snake_case label matching one of that layer's common flags (e.g. "strengths_missing", "goal_not_measurable", "no_responsible_person", "section_conflict"), or one of the writing-quality categories (grammar, clarity, duplicate_phrasing, formatting, word_choice, awkward_phrasing) if the issue is about writing quality rather than content
- "highlightText": exact verbatim substring from that section's text (max 100 chars, must appear word-for-word in the text)
- "recommendation": plain-English explanation a teacher can act on directly, covering (1) what's wrong or missing, (2) briefly why it matters, and (3) how to fix it — 2-3 sentences, no SPED jargon left unexplained
- "suggestedText": ONLY for the writing-quality categories — the FULL corrected or rewritten sentence/phrase, not a description of the fix. Omit this field for every other category.
- "severity": one of critical, major, minor, suggestion (see Severity levels above)

"layer_findings": an array with one entry per layer you were able to assess from the content in THIS batch (omit a layer entirely if none of its relevant content appears in this batch at all). Each object:
- "layer": one of: student_understanding, developmental_assessment, goal_quality, intervention_alignment, overall_consistency
- "status": "pass", "needs_review", or "fail" — fail means this layer has a critical gap; needs_review means it's incomplete, unclear, or you couldn't fully assess it from this batch; pass means it clearly meets the bar
- "severity": the highest severity issue found for this layer (or omit/null if status is "pass")
- "evidence_note": one sentence citing the specific evidence behind this status

Return ONLY the JSON object — no markdown, no code fences, no explanation.`;
}
