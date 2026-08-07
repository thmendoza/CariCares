/**
 * FolderAncestry.gs
 *
 * IMPORTANT: walkFolderAncestry(), isShortcutMimeType(), and
 * SHORTCUT_MIME_TYPE below this comment block must stay byte-for-byte
 * identical to apps-script/lib/folder-ancestry.js — that file is the
 * tested source of truth for the algorithm (see
 * apps-script/tests/folder-ancestry.test.js, run with plain `node`, no
 * framework). If you need to change the algorithm: edit folder-ancestry.js
 * first, rerun its tests, then copy the two functions + constant here
 * unchanged. Everything below the "Apps Script-specific glue" marker
 * cannot be tested outside Apps Script and is not meant to match anything
 * in the .js file.
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

/* ---- Apps Script-specific glue below this line (cannot be unit tested outside Apps Script) ---- */

/**
 * Direct parent folder IDs for a given folder, via DriveApp. Throws on any
 * Drive API failure — callers must catch and map to FOLDER_ACCESS_DENIED.
 * NOTE: standard My Drive folders only — see apps-script/README.md and
 * docs/google-docs-bridge-folder-restriction.md for the Shared Drive
 * limitation. Not required to work correctly for Shared Drive folders.
 */
function driveGetParentFolderIds_(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var parents = folder.getParents();
  var ids = [];
  while (parents.hasNext()) {
    ids.push(parents.next().getId());
  }
  return ids;
}

/**
 * Full folder-approval check for a submitted document ID.
 * Throws {code: "..."} for every rejection path (see Config.gs / Code.gs
 * for the full error code list). Returns normally (no value) only when
 * the document is confirmed inside the approved folder tree.
 */
function folderAncestryCheckDocument_(docId) {
  var approvedFolderId = configGetApprovedFolderId();
  if (!approvedFolderId) {
    Logger.log("folderAncestryCheckDocument_: CARE_APPROVED_FOLDER_ID is not configured");
    throw { code: "BRIDGE_NOT_CONFIGURED" };
  }

  try {
    DriveApp.getFolderById(approvedFolderId);
  } catch (err) {
    Logger.log("folderAncestryCheckDocument_: configured approved folder could not be opened");
    throw { code: "APPROVED_FOLDER_NOT_FOUND" };
  }

  var file;
  try {
    file = DriveApp.getFileById(docId);
  } catch (err) {
    Logger.log("folderAncestryCheckDocument_: could not open or inspect the submitted file");
    throw { code: "DOCUMENT_ACCESS_FAILED" };
  }

  if (isShortcutMimeType(file.getMimeType())) {
    Logger.log("folderAncestryCheckDocument_: submitted file is a Drive shortcut, rejecting");
    throw { code: "SHORTCUT_NOT_SUPPORTED" };
  }

  var directParentIds = [];
  var parents = file.getParents();
  while (parents.hasNext()) {
    directParentIds.push(parents.next().getId());
  }

  var result;
  try {
    result = walkFolderAncestry(directParentIds, approvedFolderId, driveGetParentFolderIds_, CONFIG_MAX_FOLDER_DEPTH);
  } catch (err) {
    Logger.log("folderAncestryCheckDocument_: Drive API failure while walking ancestry");
    throw { code: "FOLDER_ACCESS_DENIED" };
  }

  if (!result.found) {
    if (result.reason === "DEPTH_EXCEEDED") {
      Logger.log("folderAncestryCheckDocument_: ancestry walk hit max depth without resolving");
      throw { code: "FOLDER_VALIDATION_FAILED" };
    }
    Logger.log("folderAncestryCheckDocument_: document confirmed outside the approved folder tree");
    throw { code: "DOCUMENT_NOT_IN_APPROVED_FOLDER" };
  }
}
