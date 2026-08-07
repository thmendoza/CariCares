import { createHash } from "node:crypto";
import { SectionType } from "@/app/generated/prisma/client";
import type { DetectionSource, MatchConfidence, ParsedSection, ParserDiagnostics } from "./types";

const SECTION_KEYWORDS: Record<SectionType, string[]> = {
  STUDENT_PARENT_INFO: [
    "student information",
    "student & parent",
    "student and parent",
    "demographic",
    "personal information",
  ],
  BACKGROUND_HISTORY: [
    "background",
    "history",
    "medical history",
    "developmental history",
  ],
  PRESENT_LEVEL_OF_PERFORMANCE: [
    "present level",
    "plop",
    "present performance",
    "current level",
  ],
  ANNUAL_GOALS: ["annual goal", "long-term goal", "yearly goal"],
  QUARTERLY_ACADEMIC_GOALS: [
    "quarterly",
    "short-term",
    "quarterly goal",
    "academic goal",
  ],
  ACCOMMODATIONS: ["accommodation"],
  MODIFICATIONS: ["modification"],
  RECOMMENDATIONS_AND_CONSENT: [
    "recommendation",
    "consent",
    "summary and recommendation",
  ],
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// "FIRST QUARTER" / "2nd Quarter" / "3RD QUARTER:" etc. — an ordinal-quarter
// label used by some templates for Quarterly Academic Goals content instead
// of any word in SECTION_KEYWORDS. Anchored (whole candidate text, not a
// substring search) so a match is always the entire heading, never a
// fragment of a longer line — see computeMatchConfidence below.
const QUARTER_HEADING_RE = /^(1st|first|2nd|second|3rd|third|4th|fourth)\s+quarter\s*:?\s*$/i;

// Milestone 2.7 — a small, centralized, evidence-based allowlist. Each
// entry is anchored (matches from the START of the trimmed line, never a
// mid-line substring) and verified against real documents, not
// speculative:
//  - "Measurable Annual Goal:" appears as a later line inside a table cell
//    whose first line is "Area of need: X" (DOC1/2/3/5/6/7/8) — the current
//    line-0-only table scan never reaches it. Real cell text always has
//    the goal description immediately following the colon on the SAME
//    line (verified raw cell dump: "Measurable Annual Goal: Yihnno will
//    remain engaged...") — so this is a PREFIX match (anchored at the
//    start only), not a whole-line match; matching only the bare label
//    with nothing after it would never fire on real data.
//  - "ACCOMODATIONS" (missing the second "m") is a genuine misspelling
//    confirmed as a real top-level <h1> heading with nothing else on that
//    line in DOC8, block 92 — a whole-line match is correct here.
// Do not add further entries without the same kind of verification — see
// docs discussion in Milestone 2.7's plan (no fuzzy/edit-distance matching).
const EXPLICIT_ALIASES: Array<{ pattern: RegExp; sectionType: SectionType }> = [
  { pattern: /^measurable annual goals?\s*:/i, sectionType: "ANNUAL_GOALS" },
  { pattern: /^accomodations?\s*:?\s*$/i, sectionType: "ACCOMMODATIONS" },
];

interface SectionMatch {
  sectionType: SectionType;
  matchedKeyword: string;
  viaQuarterPattern: boolean;
  viaAlias: boolean;
}

// Narrow, exact/anchored matching against EXPLICIT_ALIASES only — no
// substring keyword fallback. This is deliberately the ONLY matcher used
// for a table cell's line 2+ (see promoteTableHeadings below); the general
// keyword-substring system is too loose to risk on deeper cell lines,
// which look more like flowing prose than short first-line labels.
function matchExplicitAlias(text: string): SectionMatch | null {
  const trimmed = text.trim();
  for (const { pattern, sectionType } of EXPLICIT_ALIASES) {
    if (pattern.test(trimmed)) {
      return { sectionType, matchedKeyword: trimmed, viaQuarterPattern: false, viaAlias: true };
    }
  }
  return null;
}

function matchSectionType(headingText: string): SectionMatch | null {
  const trimmed = headingText.trim();

  if (QUARTER_HEADING_RE.test(trimmed)) {
    return { sectionType: "QUARTERLY_ACADEMIC_GOALS", matchedKeyword: trimmed, viaQuarterPattern: true, viaAlias: false };
  }

  const aliasMatch = matchExplicitAlias(trimmed);
  if (aliasMatch) return aliasMatch;

  const lower = trimmed.toLowerCase();
  for (const [sectionType, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { sectionType: sectionType as SectionType, matchedKeyword: kw, viaQuarterPattern: false, viaAlias: false };
      }
    }
  }
  return null;
}

// A match is "confident" when the matched keyword essentially *is* the
// heading (starts at/near position 0, or the heading isn't much longer
// than the keyword itself — allowing for a trailing colon/article/etc.).
// It's "ambiguous" when the keyword is a small fragment buried inside a
// much longer candidate line — e.g. a data value that happens to contain a
// keyword substring, rather than a genuine section label. Deliberately
// source-agnostic: a table-cell match and a bold-paragraph match are
// judged by the exact same rule (see Milestone 2.6 correction — recovery
// method alone is not a confidence signal).
function computeMatchConfidence(headingText: string, match: SectionMatch): MatchConfidence {
  // Anchored, whole-line matches by construction — unambiguous.
  if (match.viaQuarterPattern || match.viaAlias) return "confident";

  const trimmed = headingText.trim();
  const idx = trimmed.toLowerCase().indexOf(match.matchedKeyword.toLowerCase());
  const startsNearBeginning = idx >= 0 && idx <= 2;
  const lengthDiff = trimmed.length - match.matchedKeyword.length;

  return startsNearBeginning || lengthDiff <= 15 ? "confident" : "ambiguous";
}

// The 8 sections every IEP is expected to contain (see CLAUDE.md's document
// structure). Used both for display order and to detect an incomplete parse.
export const EXPECTED_SECTION_TYPES: SectionType[] = [
  "STUDENT_PARENT_INFO",
  "BACKGROUND_HISTORY",
  "PRESENT_LEVEL_OF_PERFORMANCE",
  "ANNUAL_GOALS",
  "QUARTERLY_ACADEMIC_GOALS",
  "ACCOMMODATIONS",
  "MODIFICATIONS",
  "RECOMMENDATIONS_AND_CONSENT",
];

export const SECTION_TITLES: Record<SectionType, string> = {
  STUDENT_PARENT_INFO: "Student & Parent Information",
  BACKGROUND_HISTORY: "Background History",
  PRESENT_LEVEL_OF_PERFORMANCE: "Present Level of Performance",
  ANNUAL_GOALS: "Annual Goals",
  QUARTERLY_ACADEMIC_GOALS: "Quarterly Academic Goals",
  ACCOMMODATIONS: "Accommodations",
  MODIFICATIONS: "Modifications",
  RECOMMENDATIONS_AND_CONSENT: "Recommendations & Consent",
};

interface RawSegment {
  headingHtml: string;
  headingText: string;
  bodyHtml: string;
  sectionType: SectionType | null;
  detectionSource: DetectionSource;
  matchConfidence: MatchConfidence;
}

// Matches either a real heading tag, or a paragraph whose entire content is a
// single bold run (how this document's real-world section headers are styled —
// often inside a table cell rather than a top-level heading).
// The bold-run content uses [^<]* (not [\s\S]*?) so it can never cross a tag
// boundary — with a lazy [\s\S]*?, a paragraph like
// "<p><strong>IEP Date: </strong>December 02, 2025</p>" (bold label, plain
// value, no matching close here) would fail to close at its own </p> and keep
// scanning forward through unrelated tables/paragraphs for the next
// "</strong></p>" anywhere in the document, silently swallowing real section
// headings (e.g. "PRESENT LEVEL OF PERFORMANCE") into a bogus giant match.
// Some documents don't even bold their section headers — just a short plain
// paragraph like "<p>BACKGROUND HISTORY </p>". Match those too, but only up
// to a short length so an ordinary prose paragraph that happens to contain a
// keyword substring (e.g. "...to support his background...") doesn't get
// misread as a new section heading — real headers are short labels.
const PLAIN_HEADING_MAX_LEN = 60;

const HEADING_RE = new RegExp(
  "(<h[1-6][^>]*>[\\s\\S]*?<\\/h[1-6]>" +
    "|<p>(?:<a[^>]*><\\/a>)?<strong>[^<]*<\\/strong>(?:<br\\s*\\/?>)?<\\/p>" +
    `|<p>[^<]{1,${PLAIN_HEADING_MAX_LEN}}<\\/p>)`,
  "gi"
);

interface HeadingCandidate {
  text: string;
  source: DetectionSource;
}

function extractHeadingCandidate(part: string): HeadingCandidate | null {
  // Synthetic marker inserted by promoteTableHeadings() below — checked
  // first since its <h6 ...> shape would otherwise also match the generic
  // heading-tag pattern immediately below it.
  const tableCellMatch = part.match(/^<h6 data-source="table-cell">([\s\S]*?)<\/h6>$/i);
  if (tableCellMatch) return { text: stripHtml(tableCellMatch[1]), source: "table-cell" };

  const hMatch = part.match(/^<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>$/i);
  if (hMatch) return { text: stripHtml(hMatch[1]), source: "heading" };

  const boldMatch = part.match(
    /^<p>(?:<a[^>]*><\/a>)?<strong>([^<]*)<\/strong>(?:<br\s*\/?>)?<\/p>$/i
  );
  if (boldMatch) return { text: stripHtml(boldMatch[1]), source: "bold-paragraph" };

  const plainMatch = part.match(
    new RegExp(`^<p>([^<]{1,${PLAIN_HEADING_MAX_LEN}})<\\/p>$`, "i")
  );
  if (plainMatch) return { text: stripHtml(plainMatch[1]), source: "plain-paragraph" };

  return null;
}

const TABLE_RE = /<table>[\s\S]*?<\/table>/gi;
const ROW_RE = /<tr>[\s\S]*?<\/tr>/gi;
const FIRST_CELL_RE = /<td>([\s\S]*?)<\/td>/i;
const CELL_COUNT_RE = /<td>/gi;

/**
 * Finds a table cell's first non-empty "line" and everything after it.
 * Handles both shapes real cell content takes today:
 *  - mammoth (Word): one or more <p>...</p> paragraphs per cell.
 *  - Google Docs normalizer: a single plain-text blob with literal \n
 *    between logical lines (Apps Script's Text#getText() preserves them).
 * Returns null for an empty cell, or recurses past leading blank lines.
 * Used for the multi-cell-row fallback path only (see promoteTableHeadings)
 * — single-cell rows use splitCellIntoLines below instead, which scans
 * every line rather than just the first.
 */
function extractFirstLineAndRemainder(cellHtml: string): { first: string; remainderHtml: string } | null {
  const pMatches = cellHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (pMatches && pMatches.length > 0) {
    const first = stripHtml(pMatches[0]);
    const remainderHtml = cellHtml.slice(cellHtml.indexOf(pMatches[0]) + pMatches[0].length);
    if (first.length === 0) return extractFirstLineAndRemainder(remainderHtml);
    return { first, remainderHtml };
  }

  const withBreaks = cellHtml.replace(/<br\s*\/?>/gi, "\n");
  const newlineIdx = withBreaks.indexOf("\n");
  if (newlineIdx === -1) {
    const first = stripHtml(withBreaks);
    return first.length > 0 ? { first, remainderHtml: "" } : null;
  }
  const first = stripHtml(withBreaks.slice(0, newlineIdx));
  const remainderHtml = withBreaks.slice(newlineIdx + 1);
  if (first.length === 0) return extractFirstLineAndRemainder(remainderHtml);
  return { first, remainderHtml };
}

interface CellLine {
  plainText: string;
  rawText: string; // faithful text/HTML for this line, for lossless reconstruction
}

/**
 * Milestone 2.7 — splits a table cell's content into ALL its ordered lines
 * (not just the first), for the single-cell-row deep scan in
 * promoteTableHeadings. Handles the same two real cell shapes as
 * extractFirstLineAndRemainder. Returns a `joiner` alongside the lines so a
 * caller can losslessly rejoin any subset of them: "" for mammoth-style
 * (each line is already a self-delimiting <p>...</p>), "\n" for Google
 * Docs-style (lines were split on literal newlines).
 */
function splitCellIntoLines(cellHtml: string): { lines: CellLine[]; joiner: string } {
  const pMatches = cellHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (pMatches && pMatches.length > 0) {
    const lines = pMatches
      .map((raw) => ({ plainText: stripHtml(raw), rawText: raw }))
      .filter((l) => l.plainText.length > 0);
    return { lines, joiner: "" };
  }

  const withBreaks = cellHtml.replace(/<br\s*\/?>/gi, "\n");
  const lines = withBreaks
    .split("\n")
    .map((raw) => ({ plainText: stripHtml(raw), rawText: raw }))
    .filter((l) => l.plainText.length > 0);
  return { lines, joiner: "\n" };
}

interface TablePromotionResult {
  html: string;
  tableHeadingsRecovered: number;
  embeddedTableHeadingsRecovered: number;
  quarterHeadingsFromTables: number;
  explicitAliasRecoveries: number;
  secondCellRecoveries: number;
  unknownFromTables: string[];
}

const ALL_CELLS_RE = /<td>([\s\S]*?)<\/td>/gi;

/**
 * Pre-pass, run before the main HEADING_RE split. Walks each <table> row by
 * row. For a SINGLE-CELL row, every line of that cell is scanned in order:
 * line 0 via the general matchSectionType() (unchanged from Milestone
 * 2.6 — a known section keyword or the quarter pattern), lines 1+ via the
 * narrow matchExplicitAlias() ONLY (Milestone 2.7) — never the broad
 * keyword-substring system, to keep deeper-in-the-cell scanning safe from
 * coincidental prose matches.
 *
 * For a row with EXACTLY 2 cells (Milestone 2.8 — the verified CARe
 * template shape "Area of need: X" / "Measurable Annual Goal: ..."): cell
 * 0's first line is checked first via the same general matchSectionType()
 * as always; only if THAT doesn't match does cell 1's first line get
 * checked, and only via the narrow matchExplicitAlias() — never the broad
 * keyword system — so this never fires on an ordinary 2-column data row
 * (e.g. "Name:" / a value) where neither cell is a verified alias. Cell 0
 * is context for cell 1's heading, not a separate section — both cells
 * stay together as the new section's content (see the reconstruction
 * below: cell 0 untouched, cell 1 minus its matched first line).
 *
 * A row with 3+ cells keeps the original line-0-only behavior
 * unconditionally — no verified evidence supports deeper scanning there.
 *
 * Every matched line is promoted to a synthetic
 * <h6 data-source="table-cell"> marker, splitting the table around it —
 * content before stays with the section that precedes it, content after
 * starts fresh with the new section, subsequent rows stay in document
 * order. A row where nothing matches is pushed back byte-identical to the
 * input; reconstruction only ever happens for rows with at least one real
 * promotion, so the common (no-match) case carries zero regression risk.
 * detectSections()'s core split/merge algorithm is unchanged by any of
 * this — this pre-pass only makes table-embedded headings visible to it.
 */
function promoteTableHeadings(html: string): TablePromotionResult {
  let tableHeadingsRecovered = 0;
  let embeddedTableHeadingsRecovered = 0;
  let quarterHeadingsFromTables = 0;
  let explicitAliasRecoveries = 0;
  let secondCellRecoveries = 0;
  const unknownFromTables: string[] = [];

  const promoted = html.replace(TABLE_RE, (tableMatch) => {
    const rows = tableMatch.match(ROW_RE);
    if (!rows || rows.length === 0) return tableMatch;

    const outputParts: string[] = [];
    let currentGroupRows: string[] = [];

    const flushGroup = () => {
      if (currentGroupRows.length > 0) {
        outputParts.push(`<table>${currentGroupRows.join("")}</table>`);
        currentGroupRows = [];
      }
    };

    const recordMatch = (match: SectionMatch, lineIndex: number) => {
      if (match.viaQuarterPattern) {
        quarterHeadingsFromTables++;
        return;
      }
      if (match.viaAlias) {
        explicitAliasRecoveries++;
        if (lineIndex === 0) tableHeadingsRecovered++;
        else embeddedTableHeadingsRecovered++;
        return;
      }
      tableHeadingsRecovered++; // only reachable at lineIndex 0 — matchExplicitAlias never returns a non-alias match
    };

    for (const row of rows) {
      const cellMatch = row.match(FIRST_CELL_RE);
      if (!cellMatch) {
        currentGroupRows.push(row);
        continue;
      }

      const cellCount = (row.match(CELL_COUNT_RE) || []).length;

      if (cellCount === 2) {
        // Exactly 2 cells — try cell 0 first, same as always.
        const extracted0 = extractFirstLineAndRemainder(cellMatch[1]);
        const match0 =
          extracted0 && extracted0.first.length <= PLAIN_HEADING_MAX_LEN
            ? matchSectionType(extracted0.first)
            : null;

        if (match0) {
          flushGroup();
          recordMatch(match0, 0);
          outputParts.push(`<h6 data-source="table-cell">${extracted0!.first}</h6>`);
          currentGroupRows.push(row.replace(FIRST_CELL_RE, `<td>${extracted0!.remainderHtml}</td>`));
          continue;
        }

        // Cell 0 didn't match — check cell 1's first line via the narrow
        // alias list only (Milestone 2.8). Cell 0's full content is kept
        // as-is and travels WITH the new section (it's context for cell
        // 1's heading, not separate content of its own).
        //
        // Deliberately NO PLAIN_HEADING_MAX_LEN gate here — the verified
        // real shape is "Measurable Annual Goal: <goal text continues on
        // the same unbroken line>", often 200+ characters total. The
        // length cap exists to keep an ordinary short LABEL from being
        // mistaken for a heading; matchExplicitAlias's own anchored PREFIX
        // pattern is what keeps this narrow, not line length (same
        // reasoning already applied to line 2+ of a single-cell scan in
        // Milestone 2.7 — matchExplicitAlias is never length-gated there
        // either).
        const cells = Array.from(row.matchAll(ALL_CELLS_RE));
        const cell1Html = cells.length === 2 ? cells[1][1] : null;
        const extracted1 = cell1Html !== null ? extractFirstLineAndRemainder(cell1Html) : null;
        const match1 = extracted1 ? matchExplicitAlias(extracted1.first) : null;

        if (match1) {
          flushGroup();
          explicitAliasRecoveries++;
          secondCellRecoveries++;
          outputParts.push(`<h6 data-source="table-cell">${extracted1!.first}</h6>`);
          currentGroupRows.push(
            `<tr><td>${cellMatch[1]}</td><td>${extracted1!.remainderHtml}</td></tr>`
          );
          continue;
        }

        // Neither cell matched — untouched, exactly like before.
        if (extracted0) unknownFromTables.push(extracted0.first);
        currentGroupRows.push(row);
        continue;
      }

      if (cellCount >= 2) {
        // 3+ cells — conservative line-0-only behavior, unchanged.
        const extracted = extractFirstLineAndRemainder(cellMatch[1]);
        if (!extracted || extracted.first.length > PLAIN_HEADING_MAX_LEN) {
          currentGroupRows.push(row);
          continue;
        }
        const match = matchSectionType(extracted.first);
        if (!match) {
          unknownFromTables.push(extracted.first);
          currentGroupRows.push(row);
          continue;
        }
        flushGroup();
        recordMatch(match, 0);
        outputParts.push(`<h6 data-source="table-cell">${extracted.first}</h6>`);
        currentGroupRows.push(row.replace(FIRST_CELL_RE, `<td>${extracted.remainderHtml}</td>`));
        continue;
      }

      // Single-cell row — scan every line.
      const { lines, joiner } = splitCellIntoLines(cellMatch[1]);
      if (lines.length === 0) {
        currentGroupRows.push(row);
        continue;
      }

      let matchedAnyLine = false;
      let pending: CellLine[] = [];

      const flushPendingAsRow = () => {
        if (pending.length > 0) {
          currentGroupRows.push(`<tr><td>${pending.map((l) => l.rawText).join(joiner)}</td></tr>`);
          pending = [];
        }
      };

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const match = lineIndex === 0 ? matchSectionType(line.plainText) : matchExplicitAlias(line.plainText);

        if (!match || (lineIndex === 0 && line.plainText.length > PLAIN_HEADING_MAX_LEN)) {
          if (lineIndex === 0 && !match) unknownFromTables.push(line.plainText);
          pending.push(line);
          continue;
        }

        matchedAnyLine = true;
        flushPendingAsRow();
        flushGroup();
        recordMatch(match, lineIndex);
        outputParts.push(`<h6 data-source="table-cell">${line.plainText}</h6>`);
      }

      if (!matchedAnyLine) {
        // Nothing in this row matched — leave it byte-identical to the
        // input rather than reconstructing it, exactly like before
        // Milestone 2.7 touched this path.
        currentGroupRows.push(row);
        continue;
      }

      flushPendingAsRow(); // trailing content after the last recovered heading
    }

    flushGroup();
    return outputParts.join("");
  });

  return {
    html: promoted,
    tableHeadingsRecovered,
    embeddedTableHeadingsRecovered,
    quarterHeadingsFromTables,
    explicitAliasRecoveries,
    secondCellRecoveries,
    unknownFromTables,
  };
}

export function detectSectionsWithDiagnostics(html: string): {
  sections: ParsedSection[];
  diagnostics: ParserDiagnostics;
} {
  const startTime = Date.now();

  const tablePromotion = promoteTableHeadings(html);

  // Split on heading-like markers, keeping the delimiters
  const parts = tablePromotion.html.split(HEADING_RE);

  const segments: RawSegment[] = [];
  let pendingBody = "";
  const unknownHeadings: string[] = [...tablePromotion.unknownFromTables];
  let quarterHeadingsRecovered = tablePromotion.quarterHeadingsFromTables;
  let explicitAliasRecoveries = tablePromotion.explicitAliasRecoveries;

  for (const part of parts) {
    const candidate = extractHeadingCandidate(part);
    if (candidate !== null) {
      const match = matchSectionType(candidate.text);
      if (match !== null) {
        // Flush any pre-heading content into the previous segment or hold it
        if (segments.length > 0) {
          segments[segments.length - 1].bodyHtml += pendingBody;
        }
        pendingBody = "";
        // Table-cell matches (any line) were already counted during the
        // promotion pass above — avoid double-counting the same match here.
        if (candidate.source !== "table-cell") {
          if (match.viaQuarterPattern) quarterHeadingsRecovered++;
          if (match.viaAlias) explicitAliasRecoveries++;
        }
        segments.push({
          headingHtml: part,
          headingText: candidate.text,
          bodyHtml: "",
          sectionType: match.sectionType,
          detectionSource: match.viaQuarterPattern ? "quarter-pattern" : candidate.source,
          matchConfidence: computeMatchConfidence(candidate.text, match),
        });
      } else {
        // Unrecognised heading — collect for diagnostics, treat as body content
        unknownHeadings.push(candidate.text);
        pendingBody += part;
      }
    } else {
      // Body content between headings
      if (segments.length > 0) {
        segments[segments.length - 1].bodyHtml += pendingBody + part;
        pendingBody = "";
      } else {
        pendingBody += part;
      }
    }
  }

  // Flush trailing pendingBody into last segment
  if (pendingBody && segments.length > 0) {
    segments[segments.length - 1].bodyHtml += pendingBody;
  }

  const diagnostics: ParserDiagnostics = {
    unknownHeadings,
    tableHeadingsRecovered: tablePromotion.tableHeadingsRecovered,
    embeddedTableHeadingsRecovered: tablePromotion.embeddedTableHeadingsRecovered,
    quarterHeadingsRecovered,
    explicitAliasRecoveries,
    secondCellRecoveries: tablePromotion.secondCellRecoveries,
    processingTimeMs: Date.now() - startTime,
  };

  // If nothing matched at all, return the whole document as STUDENT_PARENT_INFO
  if (segments.length === 0) {
    const plainText = stripHtml(html);
    return {
      sections: [
        {
          sectionType: "STUDENT_PARENT_INFO",
          order: 0,
          title: "Student Information",
          rawHtml: html,
          plainText,
          contentHash: hash(plainText),
          detectionSource: "fallback",
          matchConfidence: "ambiguous",
        },
      ],
      diagnostics,
    };
  }

  // A section type can have multiple headings in the source document (e.g. one
  // "Measurable Annual Goal:" block per area of need, interleaved with quarterly
  // goals rather than grouped) — merge same-typed segments into a single section,
  // since each IEP has exactly one row per SectionType. The FIRST segment's
  // detectionSource/matchConfidence represents the merged section.
  const merged = new Map<SectionType, { html: string; source: DetectionSource; confidence: MatchConfidence }>();
  for (const seg of segments) {
    const segHtml = seg.headingHtml + seg.bodyHtml;
    const existing = merged.get(seg.sectionType!);
    if (existing) {
      existing.html += segHtml;
    } else {
      merged.set(seg.sectionType!, { html: segHtml, source: seg.detectionSource, confidence: seg.matchConfidence });
    }
  }

  // Display in the canonical reading order rather than first-appearance order,
  // since goal types can interleave in the source document.
  const ordered = EXPECTED_SECTION_TYPES.filter((t) => merged.has(t));

  const sections = ordered.map((sectionType, i) => {
    const entry = merged.get(sectionType)!;
    const plainText = stripHtml(entry.html);
    return {
      sectionType,
      order: i,
      title: SECTION_TITLES[sectionType],
      rawHtml: entry.html,
      plainText,
      contentHash: hash(plainText),
      detectionSource: entry.source,
      matchConfidence: entry.confidence,
    };
  });

  return { sections, diagnostics };
}

// Backward-compatible wrapper — existing/future callers that only need the
// section list keep working unchanged (same signature and return shape as
// before Milestone 2.6). Callers that want diagnostics call
// detectSectionsWithDiagnostics() directly instead.
export function detectSections(html: string): ParsedSection[] {
  return detectSectionsWithDiagnostics(html).sections;
}
