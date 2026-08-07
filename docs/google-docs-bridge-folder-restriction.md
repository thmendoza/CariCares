# Google Docs Bridge — Approved-Folder Restriction (Milestone 1.5)

Builds on `docs/google-docs-bridge-milestone-1.md` — read that first for the
overall architecture. This doc covers only what Milestone 1.5 added: a
requirement that every document the bridge reads must live inside a
Google Drive folder an administrator has designated as approved.

> **The approved-folder check is a defense-in-depth control. It is not a
> substitute for per-user Google authorization.**

## Threat model

Without this milestone, the bridge (running with "Execute as: Me" — see
`apps-script/README.md`) can open **any Google Doc the executing account can
access**, because CARe's shared secret only proves *the request came from
CARe's server*, not that *this specific end user* should be able to see
*this specific document*. The realistic risks that creates:

1. A bug in CARe's server, or in how the shared secret is stored/handled,
   lets someone submit an arbitrary Google Docs URL and read it — not
   limited to IEPs, limited only by what the Apps Script owner's account
   can open.
2. A teacher (accidentally or otherwise) submits a URL to a document they
   found, not one relevant to their own students, and the bridge happily
   reads it — there's no per-user authorization check at all today.

## What the approved-folder rule does

Every submitted document must be confirmed to live inside a specific,
administrator-chosen Drive folder (directly, or nested arbitrarily deep
underneath it) before Apps Script will read anything from it. This is
implemented in `apps-script/FolderAncestry.gs`'s `folderAncestryCheckDocument_()`,
called from `documentRead()` in `apps-script/DocumentService.gs` before
`DocumentApp.openByUrl()` is ever invoked.

### Why this reduces exposure

- Narrows risk #1 above from "anything the owner account can open" to
  "anything inside one folder the owner account can open" — meaningfully
  smaller blast radius if the secret leaks or a bug lets an unintended URL
  through.
- Gives an administrator a single, inspectable place (one Drive folder)
  to reason about "what can this bridge possibly read right now," rather
  than "the owner's entire Drive."
- Fails closed: if the approved folder isn't configured, or can't be
  verified, the bridge refuses to read anything rather than falling back to
  unrestricted access.

### Why it does not fully remove owner-execution risk

- The script still runs with the owner's full Drive permissions. The
  folder check is application code the script chooses to run — it is not
  Google enforcing an access boundary. A bug in `FolderAncestry.gs`, or a
  compromised/modified deployment, could still read anything the owner
  account can access, folder check or not.
- It does nothing to distinguish *which end user* submitted the request —
  any authenticated CARe user in the four allowed roles can still submit
  any document that happens to be inside the approved folder, including
  ones belonging to students they don't teach. That's a real gap; closing
  it requires per-user Google authorization (see "Deferred" below), not
  folder scoping.
- It relies on the folder actually being kept clean — if someone puts an
  unrelated sensitive document inside the approved folder, the bridge will
  happily serve it. The folder boundary is only as good as folder hygiene.

## Shared-secret limitations (carried forward from Milestone 1)

Unchanged from Milestone 1: `CARE_SHARED_SECRET` proves the request came
from a copy of CARe's server, using a best-effort constant-time comparison
(`secretIsValid_()` in `apps-script/Code.gs` — Apps Script's V8 runtime has
no `crypto.timingSafeEqual`, so this is a reasonable deterrent, not a formal
cryptographic guarantee). It says nothing about which end user is asking.
Milestone 1.5 does not change this.

## Fail-closed behavior

Every ambiguous or error case rejects the document rather than allowing it:

| Situation | Result |
|---|---|
| `CARE_APPROVED_FOLDER_ID` not set in Script Properties | `BRIDGE_NOT_CONFIGURED` — nothing is processed |
| Configured folder ID can't be opened (deleted, bad ID, no access) | `APPROVED_FOLDER_NOT_FOUND` |
| Submitted document can't be opened/inspected at all | `DOCUMENT_ACCESS_FAILED` |
| Submitted item is a Drive shortcut | `SHORTCUT_NOT_SUPPORTED` — always rejected, no attempt to resolve the target |
| Drive API fails while walking the ancestor chain | `FOLDER_ACCESS_DENIED` |
| Ancestor walk hits the depth cap (20 levels) without resolving | `FOLDER_VALIDATION_FAILED` |
| Ancestor walk completes and the approved folder isn't in the chain | `DOCUMENT_NOT_IN_APPROVED_FOLDER` |

None of these codes come with a message from Apps Script — see "Response
contract" below.

## Response contract — code-only, CARe owns the message

Per the approved plan, Apps Script responses carry only a stable `code`,
never message text:

```json
{ "success": false, "error": { "code": "DOCUMENT_NOT_IN_APPROVED_FOLDER" } }
```

`lib/google-docs-bridge.ts`'s `mapBridgeErrorCode()` is the single place
every user-facing string lives, called from `app/api/google-docs/connect/route.ts`.
This keeps the frontend contract stable even if Apps Script's internal
wording or implementation changes, and guarantees no Google-side or
implementation-specific phrasing (stack traces, internal file names, raw
Drive API error text) ever reaches the browser.

## Shortcut limitation

Google Drive shortcuts are always rejected, unconditionally — Milestone 1.5
does not attempt to resolve a shortcut to its target and validate that
instead. `apps-script/FolderAncestry.gs` checks the submitted file's
`mimeType` against `application/vnd.google-apps.shortcut` before doing
anything else; if it matches, the request is rejected with
`SHORTCUT_NOT_SUPPORTED`. This is a deliberate simplicity/safety choice —
shortcut resolution APIs are less consistently available/documented across
Apps Script versions, and "reject if we can't be sure" was the explicit
instruction. Practical implication: **move the original document into the
approved folder; a shortcut to it will never work.**

## Nested folder support

Documents are accepted whether they sit directly inside the approved folder
or anywhere in a subfolder tree underneath it (e.g. `CARe IEPs/Grade 5/
Student A/IEP 2026–2027`). Implemented as a breadth-first walk up the
file's parent chain (`walkFolderAncestry()` in `apps-script/FolderAncestry.gs`,
mirrored and tested in `apps-script/lib/folder-ancestry.js`), with:

- A visited-folder set, so no folder is ever expanded twice (defends
  against any unexpected cycle, even though normal Drive folder trees
  shouldn't have one).
- A hard depth cap of 20 levels (`CONFIG_MAX_FOLDER_DEPTH` in
  `apps-script/Config.gs`) — if the approved folder isn't found within that
  many levels, the walk stops and the document is rejected
  (`FOLDER_VALIDATION_FAILED`) rather than continuing indefinitely.

## Shared Drive limitation

**Only a standard folder in My Drive is supported.** The basic `DriveApp`
service Apps Script uses here has inconsistent support for enumerating
ancestry inside Shared Drives; reliably supporting them would need the
Advanced Drive Service (Drive API v3), which requires a linked Google Cloud
project — and this organization has Google Cloud Platform disabled. Rather
than silently add that dependency or ship unreliable behavior, Milestone
1.5 explicitly does not support Shared Drives: if `CARE_APPROVED_FOLDER_ID`
points at or under a Shared Drive, ancestry results are undefined and
should not be relied on. This is a documented future enhancement, not an
oversight.

## What remains deferred

- **Per-user Google authorization.** The biggest remaining gap — closing it
  means the bridge can tell not just "is this doc in the approved folder"
  but "is *this specific teacher* allowed to see *this specific document*."
  Most likely path: per-user Google OAuth, replacing or supplementing the
  shared-secret model. Not started.
- **Shared Drive support**, per above — would need Advanced Drive Service
  and a linked GCP project, explicitly out of scope while GCP is disabled
  for this org.
- **Automatic folder/permission management** — nothing in this milestone
  moves files, changes sharing settings, or manages the approved folder's
  contents. An administrator manages the folder manually.
- Everything already listed as deferred in
  `docs/google-docs-bridge-milestone-1.md` (AI review, IEP parsing, DB
  persistence, version history, Drive browsing/picker UI, write-back to the
  doc) — unchanged, still out of scope.

## Manual test matrix

| Test | Setup | Expected result |
|---|---|---|
| A — Approved, direct child | Dummy Google Doc directly inside the approved folder | Success |
| B — Approved, nested child | Dummy Google Doc inside a subfolder under the approved folder | Success |
| C — Outside folder | Dummy Google Doc elsewhere in Drive | `DOCUMENT_NOT_IN_APPROVED_FOLDER` |
| D — Invalid folder configuration | Temporarily set `CARE_APPROVED_FOLDER_ID` to a fake/garbage ID | `APPROVED_FOLDER_NOT_FOUND` |
| E — Shortcut | A shortcut placed inside the approved folder, pointing to a document outside it | `SHORTCUT_NOT_SUPPORTED` (rejected regardless of the shortcut's location) |
| F — Missing secret | Request with no/wrong `secret` in the body | `UNAUTHORIZED` |
| G — Missing folder property | Temporarily remove `CARE_APPROVED_FOLDER_ID` from Script Properties | `BRIDGE_NOT_CONFIGURED` |

Do not use real student IEPs until all seven of these pass against the real
deployment. See `apps-script/README.md` Step 7 for how to run A/C together
via a temporary `manualTest()` function.

### Mock mode coverage

`GOOGLE_DOC_BRIDGE_MODE=mock` (no real Apps Script call) supports these
outcomes via reserved document IDs in the submitted URL — see
`MOCK_SCENARIOS` in `lib/google-docs-bridge.ts`:

| URL | Outcome |
|---|---|
| `https://docs.google.com/document/d/mock-document/edit` (or any other ID) | Approved success, `approvedLocation: true` |
| `https://docs.google.com/document/d/mock-outside-folder/edit` | `DOCUMENT_NOT_IN_APPROVED_FOLDER` |
| `https://docs.google.com/document/d/mock-shortcut/edit` | `SHORTCUT_NOT_SUPPORTED` |
| `https://docs.google.com/document/d/mock-not-configured/edit` | `BRIDGE_NOT_CONFIGURED` |

These are explicit, documented, and only have any effect when
`GOOGLE_DOC_BRIDGE_MODE=mock` — no hidden production behavior tied to
document naming.

## Automated tests

No new test framework, per the approved plan. Two tracks, both framework-free:

- `apps-script/tests/folder-ancestry.test.js` — plain Node + `assert`, run
  with `node apps-script/tests/folder-ancestry.test.js`. Tests the pure
  ancestry-walk algorithm (`apps-script/lib/folder-ancestry.js`) against a
  mocked folder graph: missing approved folder ID, direct child, nested
  descendant, outside folder, invalid/unknown folder ID, no parents, depth
  exceeded, a Drive-API-failure propagating rather than being swallowed, a
  pathological cycle not infinite-looping, multiple direct parents, and
  shortcut mime-type detection.
- Ad hoc `npx tsx -e '...'` scripts (same pattern as Milestone 1) covering
  `lib/google-docs-bridge.ts`'s `parseAppsScriptResponse()` (new code-only
  error shape, `approvedLocation` field, oversized-content truncation still
  works) and `mapBridgeErrorCode()` (every known code maps to a real
  message, unknown codes fall back safely).

`apps-script/lib/folder-ancestry.js` is written to run unchanged in both
Node (for the test file) and Apps Script (the `module.exports` block is
guarded behind `typeof module !== "undefined"`, which is false inside Apps
Script, so it's simply skipped there). `apps-script/FolderAncestry.gs`
contains a byte-for-byte copy of the same two functions — see the comment
at the top of that file for the "keep these in sync" rule. This was a
deliberate choice over a shared TypeScript module: the real, deployed logic
lives entirely inside Apps Script, and a separate TS reimplementation of
the *production* path would risk silently drifting from what's actually
deployed. The plain-JS file is copy-paste-identical to what runs in
production, not a parallel reimplementation of it.
