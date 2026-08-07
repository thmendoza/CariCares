/**
 * Config.gs
 *
 * Central place for constants and Script Properties access.
 * Script Properties are set manually in the Apps Script editor
 * (Project Settings → Script Properties) — see apps-script/README.md.
 */

// Property name used in Script Properties (Apps Script side).
// Deliberately different from the Next.js env var name (APPS_SCRIPT_SHARED_SECRET)
// so the two systems are never confused with each other in logs or docs.
var CONFIG_SECRET_PROPERTY_KEY = "CARE_SHARED_SECRET";

// Script Property holding the Drive folder ID that documents must live
// inside (directly or in a nested subfolder) — see FolderAncestry.gs.
var CONFIG_FOLDER_PROPERTY_KEY = "CARE_APPROVED_FOLDER_ID";

// Hard caps to keep the bridge from being used as an open-ended Drive proxy.
var CONFIG_MAX_URL_LENGTH = 500;
var CONFIG_MAX_RESPONSE_CHARS = 200000; // ~200k chars ceiling on returned document body text
var CONFIG_MAX_FOLDER_DEPTH = 20; // ancestry walk cap — see FolderAncestry.gs

// Structured block extraction caps (Milestone 2) — see BlockExtractor.gs.
// Layered the same way as CONFIG_MAX_RESPONSE_CHARS: a hard array-length
// cap (protects against many tiny blocks) plus a combined text-length
// budget (protects against a few huge ones).
var CONFIG_MAX_BLOCKS = 5000;
var CONFIG_MAX_BLOCK_TEXT_CHARS = 5000; // per-block text cap
var CONFIG_MAX_BLOCKS_TOTAL_CHARS = 200000; // combined budget across all blocks

/**
 * Reads the shared secret from Script Properties.
 * Returns null if it hasn't been configured yet.
 */
function configGetSharedSecret() {
  var value = PropertiesService.getScriptProperties().getProperty(CONFIG_SECRET_PROPERTY_KEY);
  return value || null;
}

/**
 * Reads the approved folder ID from Script Properties.
 * Returns null if it hasn't been configured yet — callers must fail
 * closed (BRIDGE_NOT_CONFIGURED) rather than skip the folder check.
 */
function configGetApprovedFolderId() {
  var value = PropertiesService.getScriptProperties().getProperty(CONFIG_FOLDER_PROPERTY_KEY);
  return value || null;
}
