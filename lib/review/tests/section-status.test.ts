/**
 * Lightweight regression tests for lib/review/section-status.ts — plain
 * assertions, no framework, run with:
 *
 *   npx tsx lib/review/tests/section-status.test.ts
 */

import assert from "node:assert/strict";
import { computeSectionReviewStatus } from "../section-status";

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

console.log("section-status.test.ts");

test("no flags at all -> no_findings", () => {
  assert.equal(computeSectionReviewStatus([]), "no_findings");
});

test("only dismissed flags -> no_findings", () => {
  assert.equal(
    computeSectionReviewStatus([{ status: "DISMISSED", teacherDecision: null }]),
    "no_findings"
  );
});

test("pending coordinator flag, nothing visible -> needs_manual_review", () => {
  assert.equal(
    computeSectionReviewStatus([{ status: "PENDING_COORDINATOR", teacherDecision: null }]),
    "needs_manual_review"
  );
});

test("visible flags, none decided -> pending", () => {
  assert.equal(
    computeSectionReviewStatus([
      { status: "VISIBLE_TO_TEACHER", teacherDecision: null },
      { status: "VISIBLE_TO_TEACHER", teacherDecision: null },
    ]),
    "pending"
  );
});

test("visible flags, some decided -> in_review", () => {
  assert.equal(
    computeSectionReviewStatus([
      { status: "VISIBLE_TO_TEACHER", teacherDecision: "ACCEPTED" },
      { status: "VISIBLE_TO_TEACHER", teacherDecision: null },
    ]),
    "in_review"
  );
});

test("visible flags, all decided -> completed", () => {
  assert.equal(
    computeSectionReviewStatus([
      { status: "VISIBLE_TO_TEACHER", teacherDecision: "ACCEPTED" },
      { status: "VISIBLE_TO_TEACHER", teacherDecision: "REJECTED" },
      { status: "VISIBLE_TO_TEACHER", teacherDecision: "EDITED" },
    ]),
    "completed"
  );
});

test("single visible flag, undecided -> pending (not in_review)", () => {
  assert.equal(
    computeSectionReviewStatus([{ status: "VISIBLE_TO_TEACHER", teacherDecision: null }]),
    "pending"
  );
});

test("single visible flag, decided -> completed (not in_review)", () => {
  assert.equal(
    computeSectionReviewStatus([{ status: "VISIBLE_TO_TEACHER", teacherDecision: "ACCEPTED" }]),
    "completed"
  );
});

test("visible + a separate pending-coordinator flag -> driven by the visible ones, not needs_manual_review", () => {
  assert.equal(
    computeSectionReviewStatus([
      { status: "VISIBLE_TO_TEACHER", teacherDecision: null },
      { status: "PENDING_COORDINATOR", teacherDecision: null },
    ]),
    "pending"
  );
});

console.log(`\n${passed} tests passed.`);
