/**
 * Framework-free tests for apps-script/lib/folder-ancestry.js.
 * Run with: node apps-script/tests/folder-ancestry.test.js
 * No Jest/Vitest/etc — uses Node's built-in `assert` only, matching the
 * project's existing no-test-framework constraint.
 */
const assert = require("node:assert/strict");
const { walkFolderAncestry, isShortcutMimeType, SHORTCUT_MIME_TYPE } = require("../lib/folder-ancestry.js");

const MAX_DEPTH = 20;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// A small mocked folder graph: id -> array of parent ids.
// root
//   └── approved ("APPROVED")
//         └── grade5
//               └── studentA
// separate ("OUTSIDE") -- not under approved at all
const GRAPH = {
  APPROVED: [],
  grade5: ["APPROVED"],
  studentA: ["grade5"],
  OUTSIDE: [],
  otherRoot: [],
};

function getParentIds(id) {
  if (!(id in GRAPH)) throw new Error(`unknown folder id in test graph: ${id}`);
  return GRAPH[id];
}

test("missing approved folder ID fails closed", () => {
  const result = walkFolderAncestry(["APPROVED"], null, getParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NO_APPROVED_FOLDER");
});

test("direct child accepted", () => {
  const result = walkFolderAncestry(["APPROVED"], "APPROVED", getParentIds, MAX_DEPTH);
  assert.equal(result.found, true);
});

test("nested descendant accepted (2 levels up)", () => {
  const result = walkFolderAncestry(["studentA"], "APPROVED", getParentIds, MAX_DEPTH);
  assert.equal(result.found, true);
});

test("outside folder rejected", () => {
  const result = walkFolderAncestry(["OUTSIDE"], "APPROVED", getParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NOT_FOUND");
});

test("invalid/unknown approved folder ID rejected", () => {
  const result = walkFolderAncestry(["studentA"], "DOES_NOT_EXIST_ANYWHERE", getParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NOT_FOUND");
});

test("no parents at all (file in Drive root) rejected", () => {
  const result = walkFolderAncestry([], "APPROVED", getParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NOT_FOUND");
});

test("traversal depth exceeded is reported distinctly and terminates", () => {
  // Build a straight chain 40 levels deep, approved folder sits beyond the cap.
  const deepGraph = {};
  const chainLength = 40;
  for (let i = 0; i < chainLength; i++) {
    deepGraph[`level${i}`] = i === chainLength - 1 ? [] : [`level${i + 1}`];
  }
  deepGraph.level_start = ["level0"];
  const deepGetParentIds = (id) => deepGraph[id] || [];

  const result = walkFolderAncestry(["level0"], `level${chainLength - 1}`, deepGetParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "DEPTH_EXCEEDED");
});

test("folder access error propagates to the caller instead of silently succeeding", () => {
  const throwingGetParentIds = () => {
    throw new Error("simulated Drive API failure");
  };
  assert.throws(() => {
    walkFolderAncestry(["studentA"], "APPROVED", throwingGetParentIds, MAX_DEPTH);
  }, /simulated Drive API failure/);
});

test("cycle in the graph does not infinite-loop", () => {
  // a -> b -> a (pathological; should never happen in real Drive, but the
  // visited-set guard must still terminate safely).
  const cyclic = { a: ["b"], b: ["a"] };
  const cyclicGetParentIds = (id) => cyclic[id] || [];
  const result = walkFolderAncestry(["a"], "NOT_IN_CYCLE", cyclicGetParentIds, MAX_DEPTH);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NOT_FOUND");
});

test("multiple direct parents — approved folder found via the second one", () => {
  const result = walkFolderAncestry(["OUTSIDE", "APPROVED"], "APPROVED", getParentIds, MAX_DEPTH);
  assert.equal(result.found, true);
});

test("shortcut mime type detected", () => {
  assert.equal(isShortcutMimeType(SHORTCUT_MIME_TYPE), true);
  assert.equal(isShortcutMimeType("application/vnd.google-apps.document"), false);
  assert.equal(isShortcutMimeType(undefined), false);
});

console.log(`\n${passed} test(s) passed.`);
if (process.exitCode) {
  console.error("Some tests failed — see FAIL lines above.");
}
