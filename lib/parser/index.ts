export { docxToHtml } from "./mammoth";
export { detectSections, detectSectionsWithDiagnostics, EXPECTED_SECTION_TYPES, SECTION_TITLES } from "./section-detector";
export { normalizeBlocksToHtml } from "./google-docs-normalizer";
export { summarizeSections } from "./section-summary";
export type { ParsedSection, ParsedDocument, DetectionSource, MatchConfidence, ParserDiagnostics } from "./types";
export type { SectionSummary, SectionDetectionStatus } from "./section-summary";
