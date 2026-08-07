/**
 * Server-only bridge to the CARe Google Docs Apps Script web app.
 *
 * Milestone 1 scope: read-only document fetch (title + body text) used
 * for a temporary connection preview. Not wired into the Iep/IepSection
 * upload pipeline — see docs/google-docs-bridge-milestone-1.md.
 *
 * Milestone 1.5: Apps Script now also validates that the document lives
 * inside an approved Drive folder (see docs/google-docs-bridge-folder-restriction.md).
 * Apps Script responses are code-only — this module owns every
 * user-facing message via mapBridgeErrorCode(), so Google-side or
 * implementation-specific wording never reaches the browser.
 *
 * Two modes, switched by GOOGLE_DOC_BRIDGE_MODE:
 *  - "mock" (default): returns a fixed sample document, no network call.
 *    A handful of reserved document IDs trigger specific mock outcomes —
 *    see MOCK_SCENARIOS below.
 *  - "apps-script": POSTs to APPS_SCRIPT_WEB_APP_URL with the shared secret.
 *
 * Milestone 2: the bridge additionally reports document *structure* as a
 * `blocks` array (see lib/google-docs/blocks.ts) — headings, paragraphs,
 * tables — used by lib/parser/google-docs-normalizer.ts to feed the
 * existing lib/parser/section-detector.ts unchanged. Apps Script only
 * reports facts here; it does not decide what an IEP section is.
 *
 * Never import this file from a client component — it reads
 * server-only env vars (APPS_SCRIPT_WEB_APP_URL, APPS_SCRIPT_SHARED_SECRET).
 */

import { type DocBlock, parseDocBlocks } from "./google-docs/blocks";

export const MAX_DOC_URL_LENGTH = 500;
export const MAX_PREVIEW_CHARS = 200_000; // mirrors CONFIG_MAX_RESPONSE_CHARS in apps-script/Config.gs
export const MAX_RESPONSE_BYTES = 2_000_000; // hard cap on the raw bridge response body, before any parsing
const FETCH_TIMEOUT_MS = 10_000;

const GOOGLE_DOCS_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

export interface BridgeDocument {
  id: string;
  title: string;
  url: string;
  content: string;
  retrievedAt: string;
  truncated: boolean;
  approvedLocation: boolean;
  blocks: DocBlock[];
  blocksTruncated: boolean;
}

export type BridgeResult =
  | { success: true; document: BridgeDocument }
  | { success: false; error: { code: string } };

/**
 * Pure validation — no network, no env access. Safe to unit test
 * directly, and reused by the API route before it calls the bridge.
 */
export function isValidGoogleDocsUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  if (url.length === 0 || url.length > MAX_DOC_URL_LENGTH) return false;
  return GOOGLE_DOCS_URL_PATTERN.test(url);
}

/**
 * Extracts the document ID from a Google Docs URL. Returns null if the
 * URL doesn't match the expected shape. Pure — no network, no env access.
 */
export function extractGoogleDocsId(url: string): string | null {
  const match = GOOGLE_DOCS_URL_PATTERN.exec(url);
  return match ? match[1] : null;
}

/**
 * The single source of truth for user-facing bridge error text. Apps
 * Script only ever returns a code (see apps-script/ResponseService.gs) —
 * this is deliberate, so Google-side or implementation-specific wording
 * never leaks into the CARe UI, and so the frontend contract stays
 * stable even if the Apps Script implementation changes.
 */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: "That request could not be processed. Please try again.",
  INVALID_DOCUMENT_URL: "Please enter a valid Google Docs link.",
  DOCUMENT_ACCESS_FAILED:
    "I-CARe could not access this Google Doc. Confirm that the document exists and is accessible to the Apps Script account.",
  INTERNAL_ERROR: "Something went wrong while reading the document.",
  UNAUTHORIZED: "I-CARe could not connect to Google Docs right now.",
  BRIDGE_UNAVAILABLE: "I-CARe could not connect to Google Docs right now.",
  BRIDGE_NOT_CONFIGURED: "The Google Docs connection has not been fully configured yet.",
  DOCUMENT_NOT_IN_APPROVED_FOLDER: "This Google Doc is not stored in the approved CARe folder.",
  APPROVED_FOLDER_NOT_FOUND: "I-CARe could not verify this document's folder. Please contact an administrator.",
  FOLDER_ACCESS_DENIED: "I-CARe could not verify this document's folder. Please contact an administrator.",
  FOLDER_VALIDATION_FAILED: "I-CARe could not verify this document's folder. Please contact an administrator.",
  SHORTCUT_NOT_SUPPORTED:
    "Google Drive shortcuts are not supported. Move the original document into the approved CARe folder and try again.",
};

const DEFAULT_ERROR_MESSAGE = "I-CARe could not connect to Google Docs right now.";

/**
 * Maps a bridge error code to a safe, user-facing message. Unknown codes
 * (a future Apps Script version returning something this build doesn't
 * know about yet) fall back to a generic message rather than leaking the
 * raw code or failing.
 */
export function mapBridgeErrorCode(code: string): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Pure shape validation for whatever came back from the Apps Script
 * web app (already parsed from JSON). Defense in depth — Apps Script
 * is trusted code we wrote, but the HTTP hop between us and it is not.
 */
export function parseAppsScriptResponse(raw: unknown): BridgeResult {
  if (!raw || typeof raw !== "object") {
    return bridgeUnavailable();
  }
  const obj = raw as Record<string, unknown>;

  if (obj.success === true) {
    const doc = obj.document;
    if (!doc || typeof doc !== "object") return bridgeUnavailable();
    const d = doc as Record<string, unknown>;
    if (
      typeof d.id !== "string" ||
      typeof d.title !== "string" ||
      typeof d.url !== "string" ||
      typeof d.content !== "string" ||
      typeof d.retrievedAt !== "string"
    ) {
      return bridgeUnavailable();
    }

    const truncatedUpstream = d.truncated === true;
    const oversized = d.content.length > MAX_PREVIEW_CHARS;
    const { blocks, truncated: blocksTruncatedLocally } = parseDocBlocks(d.blocks);
    return {
      success: true,
      document: {
        id: d.id,
        title: d.title,
        url: d.url,
        content: oversized ? d.content.slice(0, MAX_PREVIEW_CHARS) : d.content,
        retrievedAt: d.retrievedAt,
        truncated: truncatedUpstream || oversized,
        approvedLocation: d.approvedLocation === true,
        blocks,
        blocksTruncated: d.blocksTruncated === true || blocksTruncatedLocally,
      },
    };
  }

  if (obj.success === false) {
    const err = obj.error;
    if (err && typeof err === "object" && typeof (err as Record<string, unknown>).code === "string") {
      return { success: false, error: { code: (err as { code: string }).code } };
    }
  }

  return bridgeUnavailable();
}

function bridgeUnavailable(): BridgeResult {
  return { success: false, error: { code: "BRIDGE_UNAVAILABLE" } };
}

/**
 * Reserved mock document IDs (the "d/<ID>" segment of a Google Docs URL)
 * that trigger specific outcomes in mock mode only. Explicit and
 * documented — no arbitrary-name-based behavior, no effect at all unless
 * GOOGLE_DOC_BRIDGE_MODE=mock. See docs/google-docs-bridge-folder-restriction.md.
 */
const MOCK_SCENARIOS: Record<string, BridgeResult> = {
  "mock-outside-folder": { success: false, error: { code: "DOCUMENT_NOT_IN_APPROVED_FOLDER" } },
  "mock-shortcut": { success: false, error: { code: "SHORTCUT_NOT_SUPPORTED" } },
  "mock-not-configured": { success: false, error: { code: "BRIDGE_NOT_CONFIGURED" } },
};

// Representative blocks for the default mock document — deliberately
// covers all three outcomes the section-summary UI needs to demonstrate:
// a couple of detected sections, one partial (very short content), and
// several left out entirely (missing). No network call, no real Doc.
const MOCK_BLOCKS: DocBlock[] = [
  { type: "paragraph", text: "STUDENT INFORMATION", isEntireParagraphBold: true },
  {
    type: "paragraph",
    text: "Student: Juan Dela Cruz. Grade 5. Diagnosis: ADHD. Program: Partial Inclusion – Pull-Out.",
  },
  { type: "paragraph", text: "BACKGROUND HISTORY", isEntireParagraphBold: true },
  {
    type: "paragraph",
    text:
      "Juan has been enrolled at the school since Kindergarten. His family reports steady progress " +
      "in social skills over the past year, though sustained attention remains a challenge during " +
      "long seated tasks in the classroom.",
  },
  { type: "paragraph", text: "ACCOMMODATIONS", isEntireParagraphBold: true },
  { type: "paragraph", text: "Extended time." },
];

function mockResult(documentUrl: string): BridgeResult {
  const id = extractGoogleDocsId(documentUrl);
  if (id && id in MOCK_SCENARIOS) {
    return MOCK_SCENARIOS[id];
  }

  return {
    success: true,
    document: {
      id: "mock-document",
      title: "Sample IEP Document",
      url: documentUrl,
      content:
        "INDIVIDUALIZED EDUCATION PLAN\nSTUDENT INFORMATION\n" +
        "This is a mock response from GOOGLE_DOC_BRIDGE_MODE=mock — no network call was made.",
      retrievedAt: new Date().toISOString(),
      truncated: false,
      approvedLocation: true,
      blocks: MOCK_BLOCKS,
      blocksTruncated: false,
    },
  };
}

/**
 * Calls the deployed Apps Script web app. Never invoked from the
 * browser — only from the /api/google-docs/connect route handler.
 */
async function callAppsScript(documentUrl: string): Promise<BridgeResult> {
  const webAppUrl = process.env.APPS_SCRIPT_WEB_APP_URL;
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET;

  if (!webAppUrl || !secret) {
    console.error("[google-docs-bridge] APPS_SCRIPT_WEB_APP_URL or APPS_SCRIPT_SHARED_SECRET is not set");
    return bridgeUnavailable();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readDocument", documentUrl, secret }),
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(`[google-docs-bridge] fetch failed (${isAbort ? "timeout" : "network error"})`);
    return bridgeUnavailable();
  } finally {
    clearTimeout(timeout);
  }

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_RESPONSE_BYTES) {
    console.error("[google-docs-bridge] response exceeded MAX_RESPONSE_BYTES (content-length)");
    return bridgeUnavailable();
  }

  let text: string;
  try {
    text = await res.text();
  } catch {
    return bridgeUnavailable();
  }

  if (text.length > MAX_RESPONSE_BYTES) {
    console.error("[google-docs-bridge] response exceeded MAX_RESPONSE_BYTES (actual body)");
    return bridgeUnavailable();
  }

  if (!res.ok) {
    console.error(`[google-docs-bridge] non-OK HTTP status: ${res.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[google-docs-bridge] response was not valid JSON");
    return bridgeUnavailable();
  }

  // Never log `parsed` or `text` here — may contain document content.
  return parseAppsScriptResponse(parsed);
}

/**
 * Entry point used by the API route. Mode is read fresh on every call
 * so tests / local dev can flip GOOGLE_DOC_BRIDGE_MODE without a restart
 * in most setups, and so the default is always safe (mock) if unset.
 */
export async function readGoogleDoc(documentUrl: string): Promise<BridgeResult> {
  const mode = process.env.GOOGLE_DOC_BRIDGE_MODE ?? "mock";
  if (mode === "apps-script") {
    return callAppsScript(documentUrl);
  }
  return mockResult(documentUrl);
}
