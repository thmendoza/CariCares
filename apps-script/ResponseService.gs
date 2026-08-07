/**
 * ResponseService.gs
 *
 * Builds the JSON HTTP responses returned by doPost(). Responses are
 * intentionally minimal: success carries the document, error carries only
 * a stable code — never a message. CARe's Next.js server owns all
 * user-facing wording (see mapBridgeErrorCode in lib/google-docs-bridge.ts)
 * so Google-side or implementation-specific phrasing never reaches the
 * browser.
 */

/**
 * Wraps a JS object as a JSON ContentService response.
 */
function responseJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Success response for a readDocument call.
 * @param {{id:string,title:string,url:string,content:string,retrievedAt:string,truncated:boolean,approvedLocation:boolean}} doc
 */
function responseSuccess(doc) {
  return responseJson_({
    success: true,
    document: doc,
  });
}

/**
 * Safe, code-only error response. No message field — see file header.
 * @param {string} code
 */
function responseError(code) {
  return responseJson_({
    success: false,
    error: {
      code: code,
    },
  });
}
