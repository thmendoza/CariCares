/**
 * DocumentService.gs
 *
 * Everything that touches DocumentApp / Google Docs URLs lives here.
 * Code.gs never calls DocumentApp directly. Folder-approval checks are
 * delegated to folderAncestryCheckDocument_() in FolderAncestry.gs.
 * Structured block extraction (Milestone 2) is delegated to
 * extractDocumentBlocks_() in BlockExtractor.gs — this file only wires it
 * in as an additive field on the existing response, nothing about the
 * folder/secret/error-code contract changes.
 *
 * Responses are code-only (no message text) — see ResponseService.gs.
 * CARe's Next.js server owns all user-facing wording
 * (lib/google-docs-bridge.ts's mapBridgeErrorCode), so error codes here
 * are the entire contract; nothing else is ever sent back to the browser.
 */

var DOC_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

/**
 * Internal-only notes for Apps Script's own execution log (Executions /
 * Logger.log). Never included in any HTTP response — see the throw sites
 * below, which pass only {code: "..."}.
 */
var DOC_LOG_NOTES = {
  INVALID_REQUEST: "request body missing or malformed",
  INVALID_DOCUMENT_URL: "document URL failed shape/length validation",
  DOCUMENT_ACCESS_FAILED: "could not open or inspect the file",
  INTERNAL_ERROR: "unexpected internal error",
};

/**
 * Validates a Google Docs URL shape and length. Does not attempt to
 * open the document — that's a separate, more expensive step.
 * @param {string} url
 * @returns {boolean}
 */
function documentIsValidUrl(url) {
  if (typeof url !== "string") return false;
  if (url.length === 0 || url.length > CONFIG_MAX_URL_LENGTH) return false;
  return DOC_URL_PATTERN.test(url);
}

/**
 * Extracts the document ID from an already-validated URL.
 * @param {string} url
 * @returns {string|null}
 */
function documentExtractId_(url) {
  var match = DOC_URL_PATTERN.exec(url);
  return match ? match[1] : null;
}

/**
 * Opens a Google Doc by URL and returns a safe, size-capped summary —
 * but only after confirming it lives inside the approved CARe folder.
 * Throws {code: "..."} objects (never raw exceptions, never message
 * text) so callers can turn them directly into responseError() calls.
 * @param {string} url
 */
function documentRead(url) {
  if (!documentIsValidUrl(url)) {
    throw { code: "INVALID_DOCUMENT_URL" };
  }

  var docId = documentExtractId_(url);
  if (!docId) {
    throw { code: "INVALID_DOCUMENT_URL" };
  }

  // Fail-closed folder check — throws for every rejection path
  // (BRIDGE_NOT_CONFIGURED, APPROVED_FOLDER_NOT_FOUND,
  // DOCUMENT_ACCESS_FAILED, SHORTCUT_NOT_SUPPORTED, FOLDER_ACCESS_DENIED,
  // FOLDER_VALIDATION_FAILED, DOCUMENT_NOT_IN_APPROVED_FOLDER). Only
  // returns normally when the document is confirmed approved.
  folderAncestryCheckDocument_(docId);

  var doc;
  try {
    doc = DocumentApp.openByUrl(url);
  } catch (err) {
    // Deliberately do not include err.message — it can echo back
    // internal Drive/Docs details. Log only that access failed, never content.
    Logger.log("documentRead: openByUrl failed after folder check passed — " + DOC_LOG_NOTES.DOCUMENT_ACCESS_FAILED);
    throw { code: "DOCUMENT_ACCESS_FAILED" };
  }

  var title = doc.getName();
  var fullText = doc.getBody().getText();
  var truncated = fullText.length > CONFIG_MAX_RESPONSE_CHARS;
  var content = truncated ? fullText.substring(0, CONFIG_MAX_RESPONSE_CHARS) : fullText;

  // Additive (Milestone 2) — existing fields above are unchanged.
  var extraction = extractDocumentBlocks_(doc);

  return {
    id: doc.getId(),
    title: title,
    url: url,
    content: content,
    retrievedAt: new Date().toISOString(),
    truncated: truncated,
    approvedLocation: true,
    blocks: extraction.blocks,
    blocksTruncated: extraction.truncated,
  };
}
