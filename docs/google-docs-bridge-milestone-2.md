# Google Docs Bridge — Milestone 2: Structured Parsing

Builds on `docs/google-docs-bridge-milestone-1.md` (bridge basics) and
`docs/google-docs-bridge-folder-restriction.md` (Milestone 1.5's
approved-folder rule, unchanged here). This doc covers only what Milestone
2 added: turning a connected Google Doc into the same normalized section
structure the Word/.docx upload path already produces — without ever
writing to the database, running AI review, or touching approvals.

## Goal

```
Google Doc
  → Apps Script reports structure (blocks: headings/paragraphs/tables)
  → CARe normalizes blocks into lightweight HTML
  → the EXISTING lib/parser/section-detector.ts detects sections
  → CARe summarizes coverage (detected / partial / missing) per section
  → shown as a temporary "Preview Parsed IEP" on the Connect Doc page
```

## Why Apps Script only reports facts

`detectSections()` (the Word-path parser, untouched) needs formatting
signals — real heading styles, or a paragraph that's entirely one bold
run — to find section boundaries. Google Docs' `getBody().getText()`
(what Milestone 1 already returns as `content`) throws all of that away.
Rather than have Apps Script decide what counts as a "section" (duplicating
`SECTION_KEYWORDS`/`HEADING_RE` logic in two runtimes, guaranteed to drift),
Apps Script now *additionally* reports raw structure — what's a heading,
what's bold, what's a table — and every bit of section-detection judgment
stays in one place: `lib/parser/section-detector.ts`.

## Convergence architecture

```
DOCX        → mammoth.ts (docxToHtml)               → normalized HTML → detectSections()
Google Docs → BlockExtractor.gs → blocks (JSON)      → normalized HTML → detectSections()
                                 → google-docs-normalizer.ts ┘
```

Only one section detector exists. `lib/parser/mammoth.ts` and
`lib/parser/section-detector.ts` were not modified — the Word upload flow
(`app/api/upload/route.ts`) behaves identically to before this milestone.

## The block schema

`lib/google-docs/blocks.ts` is the shared contract between
`apps-script/BlockExtractor.gs` (which emits blocks) and
`lib/parser/google-docs-normalizer.ts` (which consumes them):

```ts
{ type: "heading", level: 1-6, text: string }
{ type: "paragraph", text: string, isEntireParagraphBold?: boolean }
{ type: "table", rows: string[][] }
```

`isEntireParagraphBold` mirrors the exact rule the Word-path regex already
enforces: a paragraph counts as a bold "heading-like" paragraph only if
**every character** in it is bold — a paragraph with a bold label followed
by plain text (e.g. "IEP Date: " bold, "December 02, 2025" not) is *not*
a heading. `apps-script/BlockExtractor.gs`'s `textElementIsEntirelyBold_()`
implements this via `getTextAttributeIndices()` + `isBold()` per run.

List items are flattened into plain `paragraph` blocks (their text only,
no list semantics) rather than dropped — see "Extensibility" below. Images,
page breaks, bookmarks, and other element types are skipped entirely for
Milestone 2.

### Response contract — additive only

`DocumentService.gs`'s `documentRead()` gained two new fields on its
existing success object; nothing else changed:

```json
{
  "id": "...", "title": "...", "url": "...", "content": "...",
  "retrievedAt": "...", "truncated": false, "approvedLocation": true,
  "blocks": [ /* new */ ],
  "blocksTruncated": false /* new */
}
```

The folder-restriction check (`folderAncestryCheckDocument_()`), the
shared-secret validation (`secretIsValid_()`), and every error code from
Milestone 1/1.5 are unchanged — block extraction only runs *after*
`folderAncestryCheckDocument_()` has already approved the document and
`DocumentApp.openByUrl()` has already succeeded.

### Size safeguards (mirrors the existing content/response caps)

Three layered caps, both in `apps-script/Config.gs` and re-applied
independently in `lib/google-docs/blocks.ts` (defense in depth, same
pattern as the rest of the bridge):

| Cap | Value | Protects against |
|---|---|---|
| `CONFIG_MAX_BLOCKS` / `MAX_BLOCKS` | 5,000 | many tiny blocks inflating array length |
| `CONFIG_MAX_BLOCK_TEXT_CHARS` / `MAX_BLOCK_TEXT_CHARS` | 5,000 chars | one oversized block (e.g. a huge pasted paragraph) |
| `CONFIG_MAX_BLOCKS_TOTAL_CHARS` / `MAX_BLOCKS_TOTAL_CHARS` | 200,000 chars | combined size across all blocks (same budget as `content`) |

If any cap is hit, extraction stops and `blocksTruncated: true` is set —
the document isn't rejected, just partially represented, same philosophy
as the existing `content`/`truncated` fields.

`lib/google-docs/blocks.ts`'s `parseDocBlocks()` additionally drops any
individual block that doesn't match the expected shape (e.g. an unknown
future `type`, a heading with `level: 99`) rather than failing the whole
response — this is best-effort preview data, not a security boundary, so
one malformed entry shouldn't discard everything else.

## The normalizer

`lib/parser/google-docs-normalizer.ts`'s `normalizeBlocksToHtml(blocks)` is
pure (no I/O) and produces exactly the three shapes
`section-detector.ts`'s `HEADING_RE` looks for:

- `heading` → `<h${level}>text</h${level}>`
- `paragraph` with `isEntireParagraphBold: true` → `<p><strong>text</strong></p>`
- `paragraph` otherwise → `<p>text</p>`
- `table` → a plain `<table><tr><td>...` — flattened, not semantically
  parsed (matches today's Word-path fidelity; mammoth's table HTML isn't
  semantically parsed by `detectSections()` either. Full semantic table
  extraction — e.g. structured Present-Level-of-Performance
  strengths/needs — is deferred to a later milestone, not built here.)

**All block text is HTML-escaped** before being wrapped in tags — this
matters beyond correctness: the resulting HTML eventually flows through
`lib/highlight/inject-marks.ts` and `dangerouslySetInnerHTML` on the review
page in a later milestone, so unescaped `<`/`>`/`&` in a document's actual
text could otherwise break out of the generated markup. Verified with a
dedicated test case (a block containing literal `<script>` text renders as
inert escaped text, not executable-looking markup).

## Section summary (detected / partial / missing)

`lib/parser/section-summary.ts`'s `summarizeSections(sections, blocksTruncated)`
is a **mechanical, non-AI** heuristic — explicitly not the AI review
milestone:

- **missing** — the section type never appeared in `detectSections()`'s
  output at all.
- **partial** — the section was found, but its plain text is under 40
  characters (`MIN_CONTENT_CHARS_FOR_DETECTED`) — a rough "heading found,
  almost no content followed it" signal.
- **detected** — found, with reasonable content length.
- **warningCount** — `1` if partial, `+1` again if `blocksTruncated` is
  true. The truncation warning is applied to *every* non-missing section
  uniformly rather than guessing which one specifically got cut off:
  `detectSections()` reorders sections into canonical order and doesn't
  preserve original document position, so there's no reliable way to
  localize which section absorbed a mid-document truncation.

This heuristic is deliberately simple and easy to see through — it's a
placeholder for genuine judgment, not a substitute for it. Tune the
40-character threshold, or replace this file's logic entirely, without
touching the detector or normalizer.

## New API route

`POST /api/google-docs/parse-sections` — same auth gate as `/connect`
(`accountStatus === "ACTIVE"` + the four allowed roles). Takes
`{ blocks: [...] }` (the blocks the client already received from
`/connect` moments earlier — this route does not re-fetch or re-validate
the document itself, no second Apps Script call happens). Re-validates the
submitted blocks via `parseDocBlocks()` (defense in depth against a
tampered/oversized client payload), normalizes, detects, summarizes, and
returns `{ sections: SectionSummary[] }`. Nothing is written to the
database — the parsed result exists only for the duration of this request
and the client's in-memory state.

## UI

The existing Connect Google Doc page (`app/(app)/connect-doc/page.tsx`,
`components/google-docs/connect-doc-form.tsx`) gained a **"Preview Parsed
IEP"** button, shown after a successful connection. Clicking it calls the
new route and renders `components/google-docs/parsed-sections-preview.tsx`
— one card per expected section (8 total, canonical order), each showing:
title, a Detected/Partial/Missing badge, a short content preview (first
~160 characters), and a warning count badge when non-zero. No AI findings,
no comments, no approval actions — purely the mechanical parse result.

## Mock mode

`GOOGLE_DOC_BRIDGE_MODE=mock`'s default document (any URL not matching a
reserved scenario ID — see `docs/google-docs-bridge-folder-restriction.md`
for the existing `mock-outside-folder`/`mock-shortcut`/`mock-not-configured`
scenarios, unchanged) now also returns a representative `blocks` array
(`MOCK_BLOCKS` in `lib/google-docs-bridge.ts`) covering all three summary
states: `STUDENT_PARENT_INFO` and `BACKGROUND_HISTORY` detected, `ACCOMMODATIONS`
partial (short content), everything else missing — so "Preview Parsed IEP"
is fully exercisable without a real Apps Script deployment.

## Extensibility (for Milestone 3+)

Per the design requirement, the block schema's `type` field is a plain
string discriminator specifically so new block types can be added later
without redesigning the bridge response contract:

- **Not implemented yet, schema-compatible to add later:** `list_item`
  (with `listId`/`nestingLevel` for real list semantics, instead of today's
  flattened-to-paragraph fallback), `image` (currently skipped — no block
  emitted at all), `page_break` (skipped), `bookmark` (skipped), inline
  formatting spans (a `runs` array on paragraph/table-cell blocks for
  bold/italic/hyperlink ranges within a single paragraph, beyond today's
  whole-paragraph-only `isEntireParagraphBold`), checkbox state (an
  optional field for checkbox-style list items), and Doc-native comments.
- Adding any of these means: add the new `type` (or new optional field) to
  `lib/google-docs/blocks.ts`'s union + `isValidBlockShape()`, emit it from
  `apps-script/BlockExtractor.gs`, and teach
  `lib/parser/google-docs-normalizer.ts` how to render it. The bridge's
  request/response envelope, auth, folder restriction, and error codes
  need no changes for any of this.

## Manual testing (mock mode — no real deployment required)

1. `GOOGLE_DOC_BRIDGE_MODE=mock` (or unset) in `.env.local`.
2. Sign in as any ACTIVE user with an allowed role, go to **Connect IEP**.
3. Paste any Google Docs URL that doesn't match a reserved mock scenario
   ID, e.g. `https://docs.google.com/document/d/mock-document/edit`.
4. After the success card appears, click **Preview Parsed IEP**.
5. Confirm: `Student & Parent Information` and `Background History` show
   **Detected**; `Accommodations` shows **Partial** with a warning badge;
   the remaining five sections show **Missing**.

Against a real deployment (`GOOGLE_DOC_BRIDGE_MODE=apps-script`), use a
dummy IEP-shaped test document inside the approved folder — confirm
sections it actually contains show Detected/Partial appropriately and ones
it doesn't show Missing.

## What's still deferred

- AI review of any kind (explicitly out of scope for this milestone).
- Writing parsed output to `Iep`/`IepSection` — everything here is
  temporary/request-scoped.
- Semantic table extraction (Present Level of Performance strengths/needs
  as structured data, not flattened text).
- Approvals, comments, version history — untouched.
- Real list semantics, inline formatting spans, images, checkboxes, Doc
  comments — schema-ready, not implemented (see "Extensibility" above).
