/**
 * Lightweight regression tests for lib/parser/section-detector.ts —
 * plain assertions, no test framework, run directly with tsx (mirrors the
 * pattern in apps-script/tests/folder-ancestry.test.js). Run from the
 * project root:
 *
 *   npx tsx lib/parser/tests/section-detector.test.ts
 *
 * Fixtures are hand-built HTML matching exactly what
 * lib/parser/google-docs-normalizer.ts / lib/parser/mammoth.ts actually
 * produce (<table><tr><td>...) — detectSectionsWithDiagnostics() is
 * exercised directly since that's the real unit under test; no student
 * data anywhere in this file.
 */

import assert from "node:assert/strict";
import { detectSections, detectSectionsWithDiagnostics } from "../section-detector";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok — ${name}`);
  } catch (err) {
    console.error(`  FAIL — ${name}`);
    throw err;
  }
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function assertBalancedHtml(html: string) {
  for (const tag of ["table", "tr", "td"]) {
    assert.equal(
      countOccurrences(html, `<${tag}>`),
      countOccurrences(html, `</${tag}>`),
      `unbalanced <${tag}> tags in: ${html.slice(0, 200)}`
    );
  }
}

console.log("section-detector.test.ts");

// 1. "Measurable Annual Goal:" on the FIRST line of a cell — general
// matchSectionType() path (via the alias, since it's line 0), counted as
// a top-level table-cell recovery, not an embedded one.
test("Measurable Annual Goal: on first line of cell -> ANNUAL_GOALS, not embedded", () => {
  const html =
    "<table><tr><td>Measurable Annual Goal: Student will do the thing.</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const sec = sections.find((s) => s.sectionType === "ANNUAL_GOALS");
  assert.ok(sec, "ANNUAL_GOALS should be detected");
  assert.equal(sec!.detectionSource, "table-cell");
  assert.equal(diagnostics.tableHeadingsRecovered, 1);
  assert.equal(diagnostics.embeddedTableHeadingsRecovered, 0);
  assert.equal(diagnostics.explicitAliasRecoveries, 1);
});

// 2. "Measurable Annual Goal:" on a LATER line in the same cell — the
// exact real-world shape (DOC1/2/3/5/6/7/8): line 0 is "Area of need: X"
// (no match), line 1 is the goal label (alias match).
test("Measurable Annual Goal: on later line in cell -> ANNUAL_GOALS, embedded", () => {
  const html =
    "<table><tr><td>Area of need: BEHAVIOR\nMeasurable Annual Goal: Student will remain engaged.\nBaseline: currently escapes.</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const sec = sections.find((s) => s.sectionType === "ANNUAL_GOALS");
  assert.ok(sec, "ANNUAL_GOALS should be detected");
  assert.equal(sec!.detectionSource, "table-cell");
  assert.equal(sec!.matchConfidence, "confident");
  assert.equal(diagnostics.embeddedTableHeadingsRecovered, 1);
  assert.equal(diagnostics.tableHeadingsRecovered, 0);
});

// 3. Multiple section headings in one table (DOC1's real 4-row shape).
test("multiple section headings in one table are all recovered", () => {
  const html =
    "<table>" +
    "<tr><td>STUDENT INFORMATION:\nName: X\nBirthdate: Y</td></tr>" +
    "<tr><td>ELIGIBILITY:\nDiagnosis: Z</td></tr>" +
    "<tr><td>MEETING INFORMATION:\nIEP Date: today</td></tr>" +
    "<tr><td>BACKGROUND HISTORY \nStudent is a learner enrolled in the program.</td></tr>" +
    "</table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.ok(sections.find((s) => s.sectionType === "STUDENT_PARENT_INFO"));
  assert.ok(sections.find((s) => s.sectionType === "BACKGROUND_HISTORY"));
  assert.equal(diagnostics.tableHeadingsRecovered, 2);
});

// 4. Ordinary labels must never become section headings.
test("ordinary labels stay unpromoted", () => {
  const labels = [
    "Area of need:",
    "Goal #1:",
    "Baseline:",
    "Name:",
    "Teacher:",
    "Date:",
    "Assessment Result:",
    "Progress Report:",
  ];
  for (const label of labels) {
    const html = `<table><tr><td>${label} some value here</td></tr></table>`;
    const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
    assert.equal(sections.length, 1, `"${label}" should not create any real section`);
    assert.equal(sections[0].sectionType, "STUDENT_PARENT_INFO"); // whole-doc fallback
    assert.equal(diagnostics.tableHeadingsRecovered, 0);
    assert.equal(diagnostics.embeddedTableHeadingsRecovered, 0);
  }
});

// 5. Content before/after a recovered mid-cell heading is fully preserved
// — nothing dropped, nothing duplicated.
test("content before and after a recovered heading is preserved, not dropped or duplicated", () => {
  const html =
    "<h1>PRESENT LEVEL OF PERFORMANCE</h1>" +
    "<table><tr><td>Area of need: BEHAVIOR\nMeasurable Annual Goal: Do the thing.\nBaseline: some baseline text.</td></tr></table>";
  const { sections } = detectSectionsWithDiagnostics(html);
  const present = sections.find((s) => s.sectionType === "PRESENT_LEVEL_OF_PERFORMANCE");
  const goals = sections.find((s) => s.sectionType === "ANNUAL_GOALS");
  assert.ok(present && goals);
  assert.match(present!.plainText, /Area of need: BEHAVIOR/);
  assert.match(goals!.plainText, /Measurable Annual Goal: Do the thing\./);
  assert.match(goals!.plainText, /Baseline: some baseline text\./);
  // "Area of need" text must appear exactly once across both sections combined.
  const combined = present!.plainText + " " + goals!.plainText;
  assert.equal(countOccurrences(combined, "Area of need: BEHAVIOR"), 1);
  assert.equal(countOccurrences(combined, "Baseline: some baseline text."), 1);
});

// 6. ACCOMODATIONS (verified misspelling) maps to ACCOMMODATIONS.
test("ACCOMODATIONS typo alias maps to ACCOMMODATIONS", () => {
  const html = "<h1>ACCOMODATIONS</h1><p>Some accommodations text.</p>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const sec = sections.find((s) => s.sectionType === "ACCOMMODATIONS");
  assert.ok(sec, "ACCOMMODATIONS should be detected via the typo alias");
  assert.equal(sec!.detectionSource, "heading");
  assert.equal(diagnostics.explicitAliasRecoveries, 1);
});

// 7. DOC7's exact pattern — no Recommendation heading anywhere in the
// source. Must NOT be detected; no workaround should invent one.
test("DOC7 pattern: genuinely absent Recommendation is not detected", () => {
  const html =
    "<h1>INDIVIDUALIZED EDUCATION PLAN</h1>" +
    "<h1>PRESENT LEVEL OF PERFORMANCE</h1>" +
    "<table><tr><td>Area of need: COGNITIVE\nProgress Report 1: In progress.</td></tr></table>" +
    "<h1>ACCOMMODATIONS</h1>" +
    "<p>The IEP Team determined that the following accommodations are necessary.</p>" +
    "<h1>IEP TEAM SIGNATURES</h1>" +
    "<p>The following individuals participated in the development of this IEP.</p>";
  const { sections } = detectSectionsWithDiagnostics(html);
  assert.equal(
    sections.find((s) => s.sectionType === "RECOMMENDATIONS_AND_CONSENT"),
    undefined
  );
});

// 8. DOC8's exact pattern — a duplicated document-title heading sits where
// Present Level of Performance should be. Must NOT be detected as Present
// Level (no title-position heuristic); ACCOMODATIONS elsewhere still
// recovers via the alias.
test("DOC8 pattern: duplicated title heading is not misread as Present Level", () => {
  const html =
    "<h1>INDIVIDUALIZED EDUCATION PLAN</h1>" +
    "<table><tr><td>STUDENT INFORMATION:\nName: X</td></tr></table>" +
    "<h1>INDIVIDUALIZED EDUCATION PLAN</h1>" + // should have been "PRESENT LEVEL OF PERFORMANCE"
    "<table><tr><td>AREAS\nASSESSMENT RESULT</td></tr></table>" +
    "<h1>ACCOMODATIONS</h1>" +
    "<h1>MODIFICATIONS</h1>";
  const { sections } = detectSectionsWithDiagnostics(html);
  assert.equal(
    sections.find((s) => s.sectionType === "PRESENT_LEVEL_OF_PERFORMANCE"),
    undefined,
    "must not invent a Present Level match from the duplicated title"
  );
  assert.ok(sections.find((s) => s.sectionType === "ACCOMMODATIONS"));
  assert.ok(sections.find((s) => s.sectionType === "MODIFICATIONS"));
});

// 9. Existing (Milestone 2.6) table-heading behavior still works.
test("existing line-0 table-heading recovery still works", () => {
  const html = "<table><tr><td>BACKGROUND HISTORY \nStudent narrative here.</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.ok(sections.find((s) => s.sectionType === "BACKGROUND_HISTORY"));
  assert.equal(diagnostics.tableHeadingsRecovered, 1);
});

// 10. Existing (Milestone 2.6) quarter-heading behavior still works.
test("existing quarter-pattern recovery still works", () => {
  const html = "<h1>FIRST QUARTER</h1><p>Quarter content.</p><h1>SECOND QUARTER</h1><p>More.</p>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.ok(sections.find((s) => s.sectionType === "QUARTERLY_ACADEMIC_GOALS"));
  assert.equal(diagnostics.quarterHeadingsRecovered, 2);
});

// 11. No malformed HTML is ever emitted, across every fixture above.
test("no malformed HTML from table splitting", () => {
  const fixtures = [
    "<table><tr><td>Area of need: BEHAVIOR\nMeasurable Annual Goal: X\nBaseline: Y</td></tr></table>",
    "<table><tr><td>STUDENT INFORMATION:\nName: X</td></tr><tr><td>BACKGROUND HISTORY \nStory.</td></tr></table>",
    "<table><tr><td>Name:</td><td>Value</td></tr></table>", // multi-cell row, untouched fallback
  ];
  for (const html of fixtures) {
    const { sections } = detectSectionsWithDiagnostics(html);
    for (const sec of sections) assertBalancedHtml(sec.rawHtml);
  }
});

// Milestone 2.8, Priority 1/2 — the verified real CARe shape: a 2-cell row
// where cell 0 is context ("Area of need: X") and cell 1 holds the actual
// alias-matching heading. Cell 0's content must travel WITH the new
// section, not be discarded or left behind with the preceding section.
test("2-cell row: cell 0 context + cell 1 alias -> ANNUAL_GOALS, secondCellRecoveries", () => {
  const html =
    "<h1>PRESENT LEVEL OF PERFORMANCE</h1>" +
    "<table><tr><td>Area of need: BEHAVIOR</td><td>Measurable Annual Goal: Student will remain engaged.</td></tr>" +
    "<tr><td>Baseline: currently escapes tasks.</td><td></td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const goals = sections.find((s) => s.sectionType === "ANNUAL_GOALS");
  assert.ok(goals, "ANNUAL_GOALS should be recovered from the second cell");
  assert.match(goals!.plainText, /Area of need: BEHAVIOR/, "cell 0 context must be preserved");
  assert.match(goals!.plainText, /Measurable Annual Goal: Student will remain engaged\./);
  assert.match(goals!.plainText, /Baseline: currently escapes tasks\./, "the following row must stay with the new section");
  assert.equal(diagnostics.secondCellRecoveries, 1);
  assert.equal(diagnostics.explicitAliasRecoveries, 1);
  // Nothing duplicated: the context line appears exactly once in total.
  assert.equal(countOccurrences(goals!.plainText, "Area of need: BEHAVIOR"), 1);
});

// A 2-cell row where NEITHER cell matches anything must stay completely
// untouched — an ordinary "Name:" / value row must never be promoted.
test("2-cell row where neither cell matches stays untouched", () => {
  const html = "<table><tr><td>Name:</td><td>Yihnno Gabriel Carino</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].sectionType, "STUDENT_PARENT_INFO"); // whole-doc fallback, nothing promoted
  assert.equal(diagnostics.secondCellRecoveries, 0);
  assert.equal(diagnostics.tableHeadingsRecovered, 0);
});

// When cell 0 already matches, cell 1 must never even be consulted —
// existing (pre-2.8) cell-0 promotion takes priority unconditionally.
test("2-cell row: cell 0 match takes priority, cell 1 never checked", () => {
  const html = "<table><tr><td>BACKGROUND HISTORY</td><td>Measurable Annual Goal: unrelated text</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.ok(sections.find((s) => s.sectionType === "BACKGROUND_HISTORY"));
  assert.equal(sections.find((s) => s.sectionType === "ANNUAL_GOALS"), undefined);
  assert.equal(diagnostics.secondCellRecoveries, 0);
});

// A 3-cell row must stay on the conservative line-0-only path even if
// column 2 would otherwise match — no verified evidence supports 3+ cell
// scanning, guardrail explicitly scopes this to exactly 2 cells.
test("3-cell row is not deep-scanned even if a later cell would match", () => {
  const html =
    "<table><tr><td>Name:</td><td>Measurable Annual Goal: should not be found</td><td>Extra</td></tr></table>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].sectionType, "STUDENT_PARENT_INFO");
  assert.equal(diagnostics.secondCellRecoveries, 0);
});

// DOC4 must keep detecting Annual Goals through its existing (non-table)
// heading path — the new second-cell logic must not interfere.
test("DOC4 pattern: Annual Goals via top-level bold-paragraph heading still works", () => {
  const html =
    "<h1>PRESENT LEVEL OF PERFORMANCE</h1>" +
    "<p><strong>Annual Goal</strong></p>" +
    "<p>Student will achieve the stated goal by year end.</p>";
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const goals = sections.find((s) => s.sectionType === "ANNUAL_GOALS");
  assert.ok(goals);
  assert.equal(goals!.detectionSource, "bold-paragraph");
  assert.equal(diagnostics.secondCellRecoveries, 0);
});

// 12. detectSections() backward compatibility — same shape/content as
// before Milestone 2.6 ever existed (plain array, matches the .sections
// half of detectSectionsWithDiagnostics()).
test("detectSections() stays backward compatible", () => {
  const html = "<h1>ACCOMMODATIONS</h1><p>Text.</p>";
  const plain = detectSections(html);
  const { sections } = detectSectionsWithDiagnostics(html);
  assert.ok(Array.isArray(plain));
  assert.deepEqual(plain, sections);
});

console.log(`\n${passed} tests passed.`);
