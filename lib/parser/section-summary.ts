/**
 * Mechanical, non-AI summary of a parsed document's section coverage —
 * used by the Connect Google Doc preview (Milestone 2) to show
 * detected/partial/missing per section, with a short content preview and
 * a warning count. Deliberately simple, explainable heuristics only — no
 * AI review happens here (that's a later milestone, gated separately).
 */

import { SectionType } from "@/app/generated/prisma/client";
import type { DetectionSource, ParsedSection } from "./types";
import { EXPECTED_SECTION_TYPES, SECTION_TITLES } from "./section-detector";

// The parser mechanically assigns only the first four values below —
// "detected", "partial", "not_detected", "needs_confirmation". The other
// three ("not_yet_completed", "not_present_in_source", "misclassified")
// stay in the type for a future human-confirmation feature (a Coordinator
// distinguishing "teacher hasn't written this yet" from "this program
// doesn't need this section" from "the parser got this wrong"), but
// summarizeSections() below never assigns them itself — that distinction
// needs document-stage/human context this mechanical pass doesn't have
// (Milestone 2.6 correction: keyword presence elsewhere in the document is
// too weak a signal — it can't tell a genuine absence from template
// boilerplate, a table label, or a reference to another section).
export type SectionDetectionStatus =
  | "detected"
  | "partial"
  | "not_detected"
  | "needs_confirmation"
  | "not_yet_completed"
  | "not_present_in_source"
  | "misclassified";

export interface SectionSummary {
  sectionType: SectionType;
  title: string;
  status: SectionDetectionStatus;
  preview: string;
  warningCount: number;
  // Developer-facing only — the teacher-facing Parsed Section Preview does
  // not render this. undefined when the section wasn't detected at all.
  detectionSource?: DetectionSource;
}

// A detected section with less plain text than this is flagged "partial"
// rather than "detected" — a rough, mechanical signal that the section
// heading was found but very little content followed it. Not AI judgment,
// just a length threshold; easy to tune later.
const MIN_CONTENT_CHARS_FOR_DETECTED = 40;
const PREVIEW_CHARS = 160;

function buildPreview(plainText: string): string {
  const trimmed = plainText.trim();
  if (trimmed.length <= PREVIEW_CHARS) return trimmed;
  return trimmed.slice(0, PREVIEW_CHARS).trimEnd() + "…";
}

/**
 * Pure — no I/O. Safe to unit test directly.
 *
 * @param sections output of detectSections()
 * @param blocksTruncated true if the Google Docs bridge had to cut off
 *   the document's structure (see lib/google-docs-bridge.ts /
 *   lib/google-docs/blocks.ts). Since detectSections() reorders sections
 *   into canonical order and doesn't preserve original document position,
 *   we can't confidently say *which* section absorbed the cut — so this
 *   applies a "content may be incomplete" warning to every detected
 *   section uniformly rather than guessing at one.
 */
export function summarizeSections(sections: ParsedSection[], blocksTruncated: boolean): SectionSummary[] {
  const bySectionType = new Map(sections.map((s) => [s.sectionType, s]));

  return EXPECTED_SECTION_TYPES.map((sectionType): SectionSummary => {
    const title = SECTION_TITLES[sectionType];
    const section = bySectionType.get(sectionType);

    if (!section) {
      return { sectionType, title, status: "not_detected", preview: "", warningCount: 0 };
    }

    // A genuinely ambiguous match (see section-detector.ts's
    // computeMatchConfidence) always surfaces as "needs_confirmation",
    // regardless of content length or which detection path found it — a
    // confident table-cell or quarter-pattern match is exactly as
    // trustworthy as a confident real heading (Milestone 2.6 correction).
    const isShort = section.plainText.trim().length < MIN_CONTENT_CHARS_FOR_DETECTED;
    const status: SectionDetectionStatus =
      section.matchConfidence === "ambiguous" ? "needs_confirmation" : isShort ? "partial" : "detected";
    const warningCount = (isShort ? 1 : 0) + (blocksTruncated ? 1 : 0);

    return {
      sectionType,
      title,
      status,
      preview: buildPreview(section.plainText),
      warningCount,
      detectionSource: section.detectionSource,
    };
  });
}
