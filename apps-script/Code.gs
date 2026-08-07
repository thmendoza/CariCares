/**
 * Code.gs
 *
 * Entry point for the CARe Google Docs Bridge web app.
 * Only understands one action today: "readDocument" (Milestone 1),
 * now with approved-folder validation (Milestone 1.5 — see
 * FolderAncestry.gs and docs/google-docs-bridge-folder-restriction.md).
 *
 * Security model (MVP, see apps-script/README.md for the full writeup):
 * every request must include a shared secret in the JSON body that
 * matches the CARE_SHARED_SECRET Script Property. This proves the
 * request came from the CARe server (which holds the matching
 * APPS_SCRIPT_SHARED_SECRET env var) — it does NOT authenticate the
 * individual end user. The approved-folder check (Milestone 1.5) narrows
 * which documents can be read, but this is still an application-level
 * restriction layered on top of the script owner's full Drive access —
 * not a true Google permission boundary. See the README's "Execute as"
 * section and docs/google-docs-bridge-folder-restriction.md before this
 * goes near real student data.
 *
 * Responses carry only a stable error CODE, never message text — CARe's
 * Next.js server owns all user-facing wording. See ResponseService.gs.
 */

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return responseError("INVALID_REQUEST");
  }

  if (!body || typeof body !== "object") {
    return responseError("INVALID_REQUEST");
  }

  if (!secretIsValid_(body.secret)) {
    // Same code whether the secret was missing, wrong, or Script
    // Properties isn't configured yet — never hint at which.
    return responseError("UNAUTHORIZED");
  }

  if (body.action !== "readDocument") {
    return responseError("INVALID_REQUEST");
  }

  try {
    var doc = documentRead(body.documentUrl);
    return responseSuccess(doc);
  } catch (thrown) {
    if (thrown && thrown.code) {
      return responseError(thrown.code);
    }
    Logger.log("doPost: unexpected internal error");
    return responseError("INTERNAL_ERROR");
  }
}

/**
 * Best-effort constant-time string comparison. Apps Script's V8
 * runtime has no crypto.timingSafeEqual, so this walks every
 * character of the longer string regardless of where the first
 * mismatch is, to avoid an obvious early-exit timing signal. It is
 * not a formal cryptographic guarantee — treat this secret as an
 * MVP deterrent, not as strong as per-user OAuth.
 */
function secretIsValid_(submitted) {
  var expected = configGetSharedSecret();
  if (!expected) return false; // not configured yet — fail closed
  if (typeof submitted !== "string" || submitted.length === 0) return false;

  var maxLen = Math.max(expected.length, submitted.length);
  var mismatch = expected.length === submitted.length ? 0 : 1;
  for (var i = 0; i < maxLen; i++) {
    var a = i < expected.length ? expected.charCodeAt(i) : 0;
    var b = i < submitted.length ? submitted.charCodeAt(i) : 0;
    mismatch |= a ^ b;
  }
  return mismatch === 0;
}
