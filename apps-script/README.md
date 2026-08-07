# CARe Google Docs Bridge — Manual Apps Script Setup (Milestone 1)

This is a manual, copy-and-paste setup. Claude Code cannot access your Google
Workspace account, cannot open script.google.com on your behalf, and cannot
deploy anything — you do every step below yourself using the school
administrator (or your own school) account.

**Read the whole "Before you deploy" section before you click Deploy.** It
explains a real security tradeoff you have to choose, not just a formality.

---

## What this is

A small Apps Script web app with one job: given a Google Docs URL and a
shared secret, confirm the doc lives inside an approved CARe folder, then
open it and return its title + body text as JSON. CARe's server calls it
over HTTPS. Nothing else — no editing, no Drive browsing, no OAuth, no
Google Cloud Console.

**Milestone 1.5 update:** the bridge now also checks that every submitted
document lives inside a folder you designate (directly, or in a nested
subfolder underneath it) before it will read anything. This narrows what
the bridge can be used for, but — important, read the "Before you deploy"
section below — **it is still an application-level check layered on top of
the script owner's full Drive access, not a true Google permission
boundary.**

## Before you start

You'll need:
- The five source files in this repo's `apps-script/` folder: `Config.gs`,
  `DocumentService.gs`, `ResponseService.gs`, `Code.gs`, `FolderAncestry.gs`.
- A shared secret you make up yourself — any long random string (e.g. run
  `openssl rand -hex 32` locally, or use a password manager to generate one).
  You'll enter this same value in two places: Apps Script and CARe's
  `.env.local`.
- A dedicated Google Drive folder — e.g. named `CARe IEPs` — that will hold
  every document the bridge is allowed to read. Create it now if you
  haven't already (regular "New folder" in Drive, nothing special).
- A test Google Doc placed **inside** that folder, and ideally a second one
  placed **outside** it, both used for dummy runs only — no real student
  IEPs during setup.

---

## Step 1 — Open Apps Script

Go to [script.google.com](https://script.google.com) signed in as the school
Workspace account that should own this bridge. Google Cloud Console is
**not** needed for any of this.

## Step 2 — Create and rename the project

Click **New project**. Click the "Untitled project" title at the top and
rename it to:

```
CARe Google Docs Bridge
```

## Step 3 — Create the six script files

The new project starts with one empty file, usually `Code.gs`. You need six
files total, matching the names in this repo's `apps-script/` folder:

- `Code.gs` (already there — just clear it out)
- `DocumentService.gs`
- `ResponseService.gs`
- `Config.gs`
- `FolderAncestry.gs`
- `BlockExtractor.gs`

For each one you don't have yet: click the **+** next to "Files" in the
left sidebar → **Script** → name it exactly as above (no `.gs` needed in the
dialog, Apps Script adds it).

## Step 4 — Paste the source

Open each file in this repo and copy its full contents into the matching
Apps Script file, replacing whatever's there:

| Repo file | Apps Script file |
|---|---|
| `apps-script/Config.gs` | `Config.gs` |
| `apps-script/DocumentService.gs` | `DocumentService.gs` |
| `apps-script/ResponseService.gs` | `ResponseService.gs` |
| `apps-script/Code.gs` | `Code.gs` |
| `apps-script/FolderAncestry.gs` | `FolderAncestry.gs` |
| `apps-script/BlockExtractor.gs` | `BlockExtractor.gs` |

Save the project (**File → Save**, or Ctrl/Cmd+S).

## Step 5 — Get your approved folder's ID

Open your dedicated folder (e.g. `CARe IEPs`) in Google Drive. Look at the
URL:

```
https://drive.google.com/drive/folders/FOLDER_ID
```

Copy the `FOLDER_ID` portion — that long string after `/folders/`. You'll
paste it into Script Properties in the next step.

## Step 6 — Set Script Properties

In the left sidebar, click **Project Settings** (the gear icon). Scroll to
**Script Properties** → **Add script property**, and add both of these:

| Property | Value |
|---|---|
| `CARE_SHARED_SECRET` | the random secret you generated in "Before you start" |
| `CARE_APPROVED_FOLDER_ID` | the folder ID you copied in Step 5 |

Save. Neither value ever appears in the source code — `Config.gs` reads
both from here at request time. If `CARE_APPROVED_FOLDER_ID` is ever
missing, the bridge fails closed (rejects every document) rather than
skipping the folder check.

## Step 7 — Test with dummy documents

Before deploying anything publicly, confirm the script itself works. Do
this twice: once with your test doc that's **inside** the approved folder
(should succeed), once with a doc **outside** it (should be rejected with
`DOCUMENT_NOT_IN_APPROVED_FOLDER`). Avoid shortcuts for this test — a
shortcut is always rejected regardless of where it sits, see
`docs/google-docs-bridge-folder-restriction.md`.

1. Open your test Google Doc (the one **inside** the approved folder),
   copy its URL.
2. In the Apps Script editor, temporarily add this to the bottom of `Code.gs`
   (you can remove it after testing):

   ```javascript
   function manualTest() {
     var inside = documentRead("PASTE_YOUR_INSIDE_DOC_URL_HERE");
     Logger.log("INSIDE FOLDER: " + JSON.stringify(inside));

     try {
       var outside = documentRead("PASTE_YOUR_OUTSIDE_DOC_URL_HERE");
       Logger.log("OUTSIDE FOLDER (unexpected success): " + JSON.stringify(outside));
     } catch (err) {
       Logger.log("OUTSIDE FOLDER correctly rejected: " + JSON.stringify(err));
     }
   }
   ```
3. Select `manualTest` from the function dropdown at the top, click **Run**.
4. The first run will prompt you to authorize the script (it needs
   permission to read Google Docs and inspect Drive folders on your behalf)
   — review and accept.
5. Check **Executions** (left sidebar) or **View → Logs** for the output.
   You should see the inside doc's title/content, and a rejection with
   `{code: "DOCUMENT_NOT_IN_APPROVED_FOLDER"}` for the outside one.
6. Remove the `manualTest` function once confirmed.

If this step fails, nothing downstream will work — fix it here first.

---

## ⚠️ Before you deploy — read this

Deploying is where a real security decision gets made. Do not skip this.

When you go to **Deploy → New deployment → Web app** (next step), Apps
Script will ask you two questions. Stop at that screen and read below before
choosing.

### "Execute as"

- **Me (the account you're logged in as)** — the script always runs with
  *your* Google account's permissions, regardless of who submits a request
  to it. This is what Milestone 1 is built for.
- **User accessing the web app** — the script would run with the
  *caller's* Google permissions instead. Not usable here: the caller is
  CARe's Node.js server, which has no Google identity of its own, so this
  option would simply fail every request.

**The tradeoff that matters:** with "Execute as: Me," the bridge can open
**any Google Doc your account can access** — not just documents the teacher
submitting the link is supposed to see. CARe's server has no way to tell the
Apps Script "only let this teacher read their own student's doc" — the
shared secret proves the request came from CARe's server, not who the
end user is or what they're allowed to see. For a dummy test document this
is a non-issue. **It is not yet a safe permissions model for real student
IEP documents**, where a bug or leaked secret could expose anything your
account has access to, not just IEPs. That gap gets closed in a later
milestone (likely per-user Google OAuth) — Milestone 1 intentionally defers
it to prove the plumbing works first.

**Milestone 1.5's approved-folder check does not change this paragraph.**
The folder restriction (`CARE_APPROVED_FOLDER_ID`) is a check the *code*
performs after it already has the owner's full Drive access — it narrows
what the bridge will *choose* to read, but the underlying account
permissions are unchanged. A bug in the folder-check code, or a compromised
deployment, could still misuse the owner's full authority. Treat it as
defense-in-depth on top of the owner-execution risk above, not a
replacement for it. See `docs/google-docs-bridge-folder-restriction.md` for
the full writeup.

### "Who has access"

- **Only myself** — only your own Google account can call the URL directly
  in a browser. This does **not** block CARe's server, since server-to-server
  requests aren't "you" browsing to the URL — but confirm this is actually
  true for your Workspace's settings before relying on it, Workspace admin
  policies can vary.
- **Anyone with Google account** — any signed-in Google user could POST to
  the URL. The shared secret (`CARE_SHARED_SECRET`) is what actually blocks
  unauthorized use here, not this setting.
- **Anyone** — no Google sign-in required to even reach the endpoint at all.
  Widest exposure; the shared secret becomes the *only* thing standing
  between this URL and the public internet.

**Neither "Anyone with Google account" nor "Anyone" is inherently unsafe** —
they just mean the shared secret is doing all the access-control work
instead of Google's layer doing some of it. That's an acceptable MVP
tradeoff *only if* the secret is long, random, and never exposed to a
browser (it isn't — see `docs/google-docs-bridge-milestone-1.md`).

### What to do now

**Stop here and tell me which two choices you see on the deployment screen**
(the exact option labels — Google's wording occasionally varies by
Workspace configuration) before you finalize the deployment. We'll confirm
together that the combination you're about to pick matches what's described
above.

---

## Step 9 — Deploy

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → **Web app**.
3. Description: `Milestone 1.5 — folder-restricted doc bridge`.
4. Set **Execute as** and **Who has access** per the discussion above.
5. Click **Deploy**.
6. Authorize any additional permission prompts.

## Step 10 — Copy the deployment URL

After deploying, Apps Script shows a **Web app URL** ending in `/exec`. Copy
it.

## Step 11 — Add the URL and secret to CARe

In `/Users/hyznth/Desktop/CARE/.env.local`, set:

```env
GOOGLE_DOC_BRIDGE_MODE=apps-script
APPS_SCRIPT_WEB_APP_URL=<the /exec URL you just copied>
APPS_SCRIPT_SHARED_SECRET=<the same secret you put in Script Properties>
```

Restart the Next.js dev server after editing `.env.local`. Leaving
`GOOGLE_DOC_BRIDGE_MODE=mock` (or unset) keeps CARe on mock responses with no
network call — useful for local dev without touching the real bridge.

## Step 12 — Redeploying after code changes

**This is the step people usually miss.** Editing a script file and saving
it does **not** update an already-deployed web app — deployments are
frozen snapshots. After changing any `.gs` file (including
`FolderAncestry.gs` or `BlockExtractor.gs`):

1. **Deploy → Manage deployments**.
2. Click the pencil (edit) icon on the existing deployment.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

The web app URL stays the same; only the code behind it updates. (You can
also create a brand-new deployment instead, but that gives you a new URL —
only do that on purpose.) After redeploying, retest with your inside/outside
dummy documents (Step 7) before trusting the deployment again.

## Step 13 — Revoking or disabling the deployment

To turn the bridge off entirely:

1. **Deploy → Manage deployments**.
2. Click the pencil icon → change **Version** — there's no direct "disable"
   toggle, so the reliable way to fully stop it is:
3. Click the trash/archive icon next to the deployment to archive it. An
   archived deployment stops responding to requests but keeps its history.
4. To also revoke script permissions entirely: go to
   [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   on the same account and remove the script's access.

If you ever suspect the shared secret leaked, rotate it: generate a new
value, update it in **both** Script Properties (Step 6) and CARe's
`.env.local` (Step 11) at the same time, since a mismatch just breaks the
bridge with a generic "unauthorized" error until both sides match again. The
same goes for the approved folder ID if you ever need to point the bridge at
a different folder — update it in Script Properties, no code change needed.
