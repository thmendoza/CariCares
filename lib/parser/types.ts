import { SectionType } from "@/app/generated/prisma/client";

// Where a section's matched heading candidate structurally came from.
// "quarter-pattern" takes precedence over the structural origin when the
// ordinal-quarter regex is what actually classified it (see
// section-detector.ts's matchSectionType) — e.g. a quarter heading found
// inside a table cell is tagged "quarter-pattern", not "table-cell".
// "fallback" is the whole-document catch-all when nothing matched at all.
export type DetectionSource =
  | "heading"
  | "bold-paragraph"
  | "plain-paragraph"
  | "table-cell"
  | "quarter-pattern"
  | "fallback";

// Whether the keyword match is confident enough to trust outright, or
// loose enough that a human should double check it. Ambiguity is judged
// by how much of the candidate heading text the matched keyword actually
// accounts for — NOT by which DetectionSource it came from (a source is
// not evidence of unreliability by itself; see section-detector.ts's
// computeMatchConfidence).
export type MatchConfidence = "confident" | "ambiguous";

export interface ParsedSection {
  sectionType: SectionType;
  order: number;
  title: string;
  rawHtml: string;
  plainText: string;
  contentHash: string; // SHA-256 hex of plainText
  detectionSource: DetectionSource;
  matchConfidence: MatchConfidence;
}

export interface ParsedDocument {
  sections: ParsedSection[];
  rawHtml: string; // full document HTML
}

// Mechanical, per-document parse diagnostics — developer-facing only, never
// shown in the teacher-facing Parsed Section Preview. See
// section-detector.ts's detectSectionsWithDiagnostics().
export interface ParserDiagnostics {
  unknownHeadings: string[]; // heading-shaped text that matched no keyword
  tableHeadingsRecovered: number; // headings promoted out of a cell's FIRST line
  quarterHeadingsRecovered: number; // headings matched via the ordinal-quarter pattern
  // Milestone 2.7 — headings promoted from a cell's line 2+ (not the first
  // line), via the narrow matchExplicitAlias() path only. A subset is not
  // counted twice: a line-2+ match that happens to be a quarter pattern
  // still counts toward quarterHeadingsRecovered, not here.
  embeddedTableHeadingsRecovered: number;
  // Count of matches (anywhere — heading, paragraph, or table cell) that
  // came from the explicit alias list (EXPLICIT_ALIASES) rather than the
  // general keyword substring system.
  explicitAliasRecoveries: number;
  // Milestone 2.8 — headings recovered from a 2-cell row's SECOND cell,
  // when the first cell provided context but didn't itself match (the
  // verified "Area of need: X" / "Measurable Annual Goal: ..." CARe
  // template shape). A subset of explicitAliasRecoveries, not additive on
  // top of it — see section-detector.ts's promoteTableHeadings.
  secondCellRecoveries: number;
  processingTimeMs: number;
}
