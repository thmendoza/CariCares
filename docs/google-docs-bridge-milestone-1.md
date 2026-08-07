# Google Docs Bridge — Milestone 1

Status: implemented, mock-mode verified. Not yet deployed against a real
Apps Script web app (that's a manual step — see `apps-script/README.md`).

> **Milestone 1.5 update:** the bridge now also requires every document to
> live inside an approved Drive folder before it will read anything, and
> Apps Script responses are code-only (CARe owns all user-facing message
> text). See `docs/google-docs-bridge-folder-restriction.md` for that
> layer — this doc describes the original Milestone 1 baseline and is kept
> for historical reference; some details below (e.g. "Apps Script returns
> a message") were superseded by Milestone 1.5.

## Goal

Prove a safe, minimal connection path:

```
Authorized CARe user → pastes a Google Docs URL → CARe server
→ Apps Script bridge → Google Doc → title + body text
→ back to CARe → shown as a read-only preview
```

Nothing here writes to the Iep/IepSection tables, parses IEP structure, runs
AI review, or edits the source Google Doc. It is intentionally a dead-end
preview, kept separate from the real `.docx` upload pipeline
(`app/api/upload/route.ts`), so it can't accidentally interfere with
production data while still being real, end-to-end, testable code.

## Architecture

```
components/google-docs/connect-doc-form.tsx   (client — URL input, states)
        │  POST /api/google-docs/connect  { documentUrl }
        ▼
app/api/google-docs/connect/route.ts          (server — auth + role gate)
        │  readGoogleDoc(documentUrl)
        ▼
lib/google-docs-bridge.ts                     (server-only — mode switch)
        │  mode="apps-script": POST { action, documentUrl, secret }
        ▼
apps-script/*.gs  (deployed manually, outside this repo's build)
        │  DocumentApp.openByUrl(...)
        ▼
Google Docs
```

The browser never talks to Apps Script directly, and never receives
`APPS_SCRIPT_WEB_APP_URL` or `APPS_SCRIPT_SHARED_SECRET` — both are read
only inside `lib/google-docs-bridge.ts`, a server-only module.

## Access control

`app/api/google-docs/connect/route.ts` and `app/(app)/connect-doc/page.tsx`
both require:

- a valid session (`auth()` resolves a user), and
- `session.user.accountStatus === "ACTIVE"`, and
- `session.user.role` in `TEACHER | ACADEMIC_COORDINATOR | SCHOOL_ADMIN | THERAPIST`

Pending or suspended accounts get redirected (page) or a 401 (API route).
This reuses the existing NextAuth session — no new auth system was added.

## Modes

Controlled by `GOOGLE_DOC_BRIDGE_MODE` in `.env.local`:

| Mode | Behavior |
|---|---|
| `mock` (default, or unset) | Returns a fixed sample document. No network call, no env vars required. Safe for local dev with nothing configured. |
| `apps-script` | POSTs to `APPS_SCRIPT_WEB_APP_URL` with the shared secret in the JSON body. Requires `APPS_SCRIPT_WEB_APP_URL` and `APPS_SCRIPT_SHARED_SECRET` to be set. |

## Environment variables

Added to `.env.local` (already present, empty/mock by default):

```env
GOOGLE_DOC_BRIDGE_MODE=mock
APPS_SCRIPT_WEB_APP_URL=
APPS_SCRIPT_SHARED_SECRET=
```

Nothing here is committed with a real value — `.env.local` stays gitignored
as it already was.

## Shared-secret security model — MVP, not production-grade

The Next.js server sends `APPS_SCRIPT_SHARED_SECRET` inside the POST body
(never a custom header) to `apps-script/Code.gs`, which compares it against
`CARE_SHARED_SECRET` in Apps Script's Script Properties using a best-effort
constant-time comparison (`secretIsValid_` in `Code.gs` — see that file's
comment for why it's "best-effort" rather than a formal guarantee; Apps
Script's V8 runtime has no `crypto.timingSafeEqual`).

**What this secret proves:** the request came from a copy of CARe's server
that holds the configured secret.
**What this secret does NOT prove:** that the specific end user submitting
the URL is allowed, under Google's own permission model, to see that
document. Depending on the "Execute as" deployment choice (see
`apps-script/README.md`), the bridge may run with the Apps Script owner's
own Google permissions — meaning it can technically open any document that
account can access, not just ones relevant to the requesting teacher. This
is documented and flagged prominently in `apps-script/README.md` and is
explicitly **not** considered safe for real student IEP documents yet. It's
acceptable for Milestone 1 because testing only uses dummy documents.
Closing this gap (most likely via per-user Google OAuth) is deferred to a
later milestone.

## Safeguards implemented

- **URL length cap** — 500 chars, enforced client-side, server-side
  (`isValidGoogleDocsUrl` in `lib/google-docs-bridge.ts`), and inside Apps
  Script (`CONFIG_MAX_URL_LENGTH` in `Config.gs`).
- **URL shape validation** — must match
  `^https://docs.google.com/document/d/...` — same regex enforced in three
  places (client, API route, Apps Script) as defense in depth.
- **Fetch timeout** — the server-to-Apps-Script call aborts after 10s
  (`FETCH_TIMEOUT_MS` in `lib/google-docs-bridge.ts`) via `AbortController`,
  rather than hanging the request indefinitely.
- **Response size caps** — the raw Apps Script response is rejected above
  2MB (`MAX_RESPONSE_BYTES`, checked via `content-length` header first, then
  actual body length) before any JSON parsing is attempted. Document content
  itself is capped at 200,000 characters both inside Apps Script
  (`CONFIG_MAX_RESPONSE_CHARS`) and again on the Next.js side
  (`MAX_PREVIEW_CHARS`) as defense in depth.
- **Response shape validation** — `parseAppsScriptResponse()` rejects
  anything that doesn't match the exact expected success/error shape,
  falling back to a generic "bridge unavailable" result rather than passing
  unknown data through.
- **UI preview truncation** — the client additionally caps the *displayed*
  preview at 4,000 characters (`PREVIEW_DISPLAY_CHARS` in
  `connect-doc-form.tsx`) regardless of how much came back from the server,
  with a visible "truncated" note.
- **No content logging** — grep `lib/google-docs-bridge.ts`,
  `app/api/google-docs/connect/route.ts`, and the `.gs` files: every
  `console.error`/`console.warn`/`Logger.log` call logs a fixed message or
  an error *code*, never `document.content`, the parsed response body, or
  raw exception text (which could echo back Doc titles or paths).

## How to test locally (mock mode)

1. Ensure `.env.local` has `GOOGLE_DOC_BRIDGE_MODE=mock` (or leave it unset).
2. `npm run dev`, sign in as any ACTIVE user with one of the four allowed
   roles.
3. Go to **Connect IEP** in the nav (or `/connect-doc` directly).
4. Paste any syntactically valid Google Docs URL, e.g.
   `https://docs.google.com/document/d/mock-document/edit` — mock mode
   doesn't actually fetch it, so the URL just needs to match the pattern.
5. Confirm the success card shows the fixed sample title/content and an
   "Open in Google Docs" link.

## How to test against a real deployment (apps-script mode)

Requires completing `apps-script/README.md` first (manual, on the school
Workspace account). Then:

1. Set `GOOGLE_DOC_BRIDGE_MODE=apps-script`, `APPS_SCRIPT_WEB_APP_URL`, and
   `APPS_SCRIPT_SHARED_SECRET` in `.env.local`.
2. Restart `npm run dev`.
3. Use a real (dummy/test) Google Doc URL that the Apps Script's executing
   account can access.
4. Confirm the returned title/content matches the actual document.

## Manual test matrix (no automated test framework yet — see below)

| Case | How to trigger | Expected |
|---|---|---|
| Valid Google Docs URL, mock mode | Paste a well-formed URL | Success card, sample content |
| Invalid URL (not a Docs link) | Paste `https://example.com` | Inline error: "Please enter a valid Google Docs link." |
| Empty URL | Submit with the field empty | Submit button stays disabled |
| URL over 500 chars | Paste an artificially long string | Inline error before any request is sent |
| Apps-script mode, doc the executing account can't open | Use a URL to a doc not shared with the script's account | "CARe could not access this Google Doc..." |
| Apps-script mode, wrong/missing shared secret | Temporarily mismatch `.env.local` vs Script Properties | Generic "could not be authorized" from Apps Script → surfaces as a connection error, not a hint about the secret |
| Apps-script mode, Apps Script unreachable/misconfigured URL | Set `APPS_SCRIPT_WEB_APP_URL` to a bad URL | "CARe could not connect to Google Docs right now." |
| Apps-script mode, slow/hanging response | Hard to simulate manually; covered by the 10s timeout logic — reasonable to trust by code review for Milestone 1 | Times out, same "could not connect" message |
| Not signed in | Hit `/connect-doc` logged out | Redirected to sign-in via existing middleware |
| Signed in, PENDING_APPROVAL status | Use a pending test account | Redirected to `/dashboard` |
| Signed in, role not in the allowed list | N/A today — all four existing roles are allowed; revisit if a new role is ever added | — |

## What should get automated tests later

The pure, side-effect-free functions were deliberately factored out so this
is a small lift whenever a test framework is introduced:

- `isValidGoogleDocsUrl()` (`lib/google-docs-bridge.ts`) — URL shape/length
  edge cases (empty, too long, http vs https, missing `/d/`, trailing
  garbage).
- `parseAppsScriptResponse()` (`lib/google-docs-bridge.ts`) — malformed
  shapes: missing fields, wrong types, oversized content, both
  success/error branches, completely unrecognized payloads.
- `documentIsValidUrl()` / the `secretIsValid_()` comparison logic in
  `apps-script/Code.gs` — Apps Script doesn't support a standard JS test
  runner directly, so this would need either a thin local reimplementation
  test or Apps Script's `clasp` + a test harness, which is out of scope for
  Milestone 1.
- API route auth-gating (`app/api/google-docs/connect/route.ts`) — would
  need a lightweight integration test with a mocked session once a test
  framework is added, covering: no session, wrong role, PENDING_APPROVAL
  status, and the happy path.

No test framework (Jest/Vitest/etc.) was added in this milestone — the repo
currently has none, and introducing one was explicitly out of scope per the
approved plan.

## Known limitations / deferred to later milestones

- **Execute-as permissions gap** — see "Shared-secret security model"
  above. The biggest open item before this touches real student data.
- No Google OAuth — CARe's own auth is still email/password
  (`Credentials` provider); the original project brief's "Google Workspace
  OAuth" sign-in hasn't been built yet, independent of this bridge.
- No Drive browsing/picker — user must paste an exact document URL.
- No write-back to the Google Doc.
- No connection to `Iep`/`IepSection` — the fetched content isn't parsed,
  stored, or run through the AI review pipeline.
- No retry/backoff on transient Apps Script failures — a single attempt,
  surfaced as a generic error on failure.
- No rate limiting on `/api/google-docs/connect` beyond normal session auth.
