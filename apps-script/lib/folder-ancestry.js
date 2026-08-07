/**
 * folder-ancestry.js
 *
 * Pure, dependency-free algorithm for walking up a Google Drive folder
 * tree looking for an approved ancestor folder. No DriveApp, no Apps
 * Script globals — runs identically under plain Node (for testing, see
 * apps-script/tests/folder-ancestry.test.js) and inside Apps Script.
 *
 * SOURCE OF TRUTH: apps-script/FolderAncestry.gs contains a byte-for-byte
 * copy of walkFolderAncestry / isShortcutMimeType / SHORTCUT_MIME_TYPE
 * below, plus Apps Script-specific DriveApp glue that can't be tested
 * outside Apps Script. If you change the algorithm here, rerun this
 * file's tests, then copy the updated functions into FolderAncestry.gs.
 */

var SHORTCUT_MIME_TYPE = "application/vnd.google-apps.shortcut";

function isShortcutMimeType(mimeType) {
  return mimeType === SHORTCUT_MIME_TYPE;
}

/**
 * Breadth-first walk up a folder tree, starting from a file's direct
 * parent folder IDs, looking for approvedFolderId among all ancestors.
 *
 * @param {string[]} startFolderIds - the file's direct parent folder IDs
 * @param {string|null} approvedFolderId - the configured approved folder ID
 * @param {function(string): string[]} getParentIds - returns a folder's
 *   direct parent folder IDs; may throw (e.g. Drive API failure) — the
 *   caller is responsible for catching that and mapping it to a safe
 *   error code, this function does not catch it.
 * @param {number} maxDepth - traversal depth cap (e.g. 20)
 * @returns {{found: boolean, reason?: "NO_APPROVED_FOLDER"|"NOT_FOUND"|"DEPTH_EXCEEDED"}}
 */
function walkFolderAncestry(startFolderIds, approvedFolderId, getParentIds, maxDepth) {
  if (!approvedFolderId) {
    return { found: false, reason: "NO_APPROVED_FOLDER" };
  }
  if (!startFolderIds || startFolderIds.length === 0) {
    return { found: false, reason: "NOT_FOUND" };
  }

  var visited = {};
  var queue = [];
  for (var i = 0; i < startFolderIds.length; i++) {
    queue.push({ id: startFolderIds[i], depth: 1 });
  }

  var depthExceeded = false;

  while (queue.length > 0) {
    var current = queue.shift();

    if (current.id === approvedFolderId) {
      return { found: true };
    }

    if (visited[current.id]) {
      continue; // cycle guard — never re-expand a folder we've already visited
    }
    visited[current.id] = true;

    if (current.depth >= maxDepth) {
      depthExceeded = true;
      continue; // do not expand further from this branch
    }

    var parents = getParentIds(current.id) || [];
    for (var j = 0; j < parents.length; j++) {
      queue.push({ id: parents[j], depth: current.depth + 1 });
    }
  }

  return { found: false, reason: depthExceeded ? "DEPTH_EXCEEDED" : "NOT_FOUND" };
}

// Safe in both Node (exports the functions) and Apps Script (typeof module
// is "undefined" there, so this whole block is skipped — no ReferenceError).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    walkFolderAncestry: walkFolderAncestry,
    isShortcutMimeType: isShortcutMimeType,
    SHORTCUT_MIME_TYPE: SHORTCUT_MIME_TYPE,
  };
}
