# CARe (SPED) IEP Review Assistant — Project Brief

This is the starting context for building this app in Claude Code. Drop this file into the project root as `CLAUDE.md` (or keep it as `PROJECT_BRIEF.md` and point Claude Code at it on the first session) so it persists across sessions.

## Problem

Teachers in the CARe (SPED) department write and maintain IEPs largely on their own, and return to the same document every quarter to add progress reports. Quality control today is manual: an Academic Coordinator reads the full document looking for weak goals, mismatched accommodations, or unclear language. It's slow, inconsistent across reviewers, and teachers get feedback long after they've moved on from the draft.

## Concept

A tool that reviews an IEP a teacher has already written — it does not write or generate IEPs. A teacher uploads or updates a draft, and the tool highlights sections that need work, explains why, and recommends a fix. Coordinators, Admins, and in-house Therapists can also highlight and comment directly, the way they would in Google Docs. The teacher stays the author. The tool and the humans reviewing it are a fast, consistent feedback layer — and it comes back every quarter, not just once.

## Users & roles

| Role | What they need | What they do |
|---|---|---|
| Teacher | Fast, specific feedback without waiting on a coordinator's schedule. | Uploads/updates an IEP each quarter, reviews AI highlights and human comments, replies to comment threads, revises in Word, re-uploads. |
| Academic Coordinator | Visibility into which IEPs need attention; a checkpoint on higher-stakes calls. | Reviews and approves flagged fit-to-student recommendations before they reach the teacher; highlights/comments directly on documents; gives first-stage approval. |
| School Admin (Vice Principal / Principal / School Director) | Assurance IEPs are consistent and on schedule; account oversight. | Approves new user role requests; highlights/comments same as Coordinator; gives second-stage (final) approval — any one of the three titles can do this, and whichever one does is recorded on the record. |
| Therapist (in-house OT/ST) | A way to make sure therapy goals carry into the classroom. | Adds therapy goals directly to a student's IEP. Depending on the goal, it either lives in its own therapy section or becomes a suggested classroom accommodation — trusted directly, no Coordinator approval needed. |

Not every student has a therapist, and some go outside the school for therapy. Track a simple status per student: **None / In-house / External**. For External, the teacher can log notes on what an outside therapist reported, even though that therapist has no account.

## Accounts & access

- Sign-in: Google Workspace OAuth (school accounts only).
- On first sign-in, the user self-selects a role. A School Admin must approve before access is granted.
- Bootstrap: the first School Admin account is seeded directly (not through the self-approval flow), so there's someone to approve everyone else.

## The CARe programs

Six programs across two tracks. "Good" looks different in each, so the review needs to calibrate to the student's program rather than apply one universal bar.

| Track | Program | What "good" looks like |
|---|---|---|
| Graded | Full Inclusion — without services | Goals track grade-level curriculum with minimal scaffolding. |
| Graded | Full Inclusion — with shadow teacher / SNEd tutorial | Grade-level goals, but accommodations should reflect in-class shadow support. |
| Graded | Partial Inclusion — Pull-Out | Grade-level goals in most subjects; modified/functional goals in the pulled-out subject(s). |
| Graded | Partial Inclusion — Intensive Resource Program | Heavier modification across more subjects than standard pull-out. |
| Non-Graded | Pre-Vocational Classes | Goals should be functional/vocational — a grade-level academic goal here is a red flag, not a strength. |
| Non-Graded | Early Childhood Classes | Goals should track age-appropriate developmental milestones, not grade curriculum. |

**Open question:** program isn't recorded as its own field today — it has to be inferred from which service checkboxes are marked (Pull-Out, SPED Tutorial, Early Intervention, Pre-Vocational, Other). Decide whether to infer from checkboxes or add an explicit program field / pull from a roster/SIS.

## IEP document structure

Based on a real anonymized sample IEP. The parser needs to handle this shape:

1. **Student / Parent Info & Eligibility** — demographics, diagnosis, assessment date, recommended services & placement (checkboxes).
2. **Background History** — free-text narrative: student profile, history, family context, long-term goals.
3. **Present Level of Performance** — table of strengths (+) and needs (−) across Behavior, Self-Help, Language & Communication, Socio-Emotional, Cognition/Literacy/Math.
4. **Per-domain Annual Goals** — one per area of need: baseline, a measurable annual goal, and four quarterly progress-report narratives (in progress / achieved).
5. **Quarterly Academic Goals** — per subject, per quarter: a parent goal plus several scored sub-goals, each with a percentage-accuracy progress report.
6. **Accommodations** — fixed checklist: Instruction, Assignment, Environment, Behavior & Focus, Assessments.
7. **Modifications** — fixed checklist: Curriculum Content, Assignment, Instructional Goals, Assessments.
8. **Recommendations, Consent & Signatures** — promotion/placement recommendation, parent consent, IEP team sign-off.

It's one standard template across all six programs — only the content inside varies by program and student.

## Review standard

Not tied to DepEd/RA 11650 — as a private school, the department prioritizes judgment focused on the individual student over a fixed external checklist. The review combines three things:

1. **Internal consistency** — present levels, baseline, goals, and accommodations should logically support each other.
2. **Diagnosis- and program-appropriate practice** — goals/accommodations should fit what's generally effective for the student's diagnosis and the goal-type expected for their program.
3. **Coordinator-style judgment** — approximate what an experienced Academic Coordinator would personally flag, including writing clarity (grammar, name misspellings, duplicated phrasing).

## Core workflow

1. **Upload/update** — teacher uploads a new IEP, or an update to an existing one.
2. **Analyze** — tool parses the document and checks it against the review standard, calibrated to the student's program.
3. **Route by stakes** — lower-stakes flags (consistency, clarity, completeness) go straight to the teacher. Higher-stakes flags (does this actually fit the student) route to the Academic Coordinator for approval first.
4. **Human review** — Coordinators, Admins, and Therapists can also highlight text and leave their own comments, independent of the AI's flags.
5. **Export with comments** — teacher downloads a Word file with all approved AI recommendations and human comments embedded as native Word comments (same model as Google Docs comments). No custom in-app editor for v1 — teachers edit in Word/Google Docs, a tool they already know.
6. **Revise & re-upload** — teacher edits, replies to comment threads inside Word/Google Docs (those replies do **not** sync back into the app for v1 — keep it simple), and re-uploads. This becomes the next version and loops back to step 2.
7. **Two-stage approval** — once the document is in good shape: Academic Coordinator approves first, then any one of the three School Admin titles (VP / Principal / Director) gives final approval. Whichever title approved is recorded on the IEP.
8. **Recurring** — this whole cycle repeats each quarter as new progress reports are added, not just once at initial drafting.

### Status pipeline (per IEP)

```
Draft → Submitted v1 → In Review v1 → Revisions Needed v1
→ Submitted v2 → In Review v2 → ... 
→ Coordinator Approved → Admin Approved (title recorded) → Approved
```

## History & collaborative review

- **Manual comments**: Academic Coordinators, School Admins, and Therapists can highlight any text and leave a comment (Google Docs-style). Threaded — teacher can reply, but doesn't start new threads (open question below). Visually distinct from AI-generated highlights (e.g. labeled "Coordinator comment" vs. "AI suggestion") so the source is always clear.
- **Action history**: logs document uploads/revisions, comments left, and approve/reject decisions. Does **not** log sign-ins or other account activity. Teachers see history scoped to their own students' IEPs; Coordinators/Admins see the whole department.

## Design direction

- **Brand colors**: pink (main), green, red, white — no blue anywhere in the interface.
- **Status colors**: pink for active states (Submitted, In Review), red for Revisions Needed, green for Approved, gray/muted for Draft.
- **Overall tone**: soft and friendly throughout — rounded corners (12px cards), generous whitespace, gentle accent colors. This handles sensitive student data for a staff audience, so it should feel warm without being cold/clinical, but stay clean and easy to scan, not busy.
- **Mascot**: a small, cute, fluffy blue/purple monster character (round body, two starred antennae, big eyes, soft smile) — it keeps its own original pastel blue/purple/pink coloring regardless of the site's pink/green/red/white palette; it's a distinct character, not reskinned to brand colors. It appears in exactly three places:
  1. A small persistent logo mark in the top nav (identity, not a big feature).
  2. Empty states and onboarding — e.g. no IEPs yet, first sign-in.
  3. Celebratory moments — e.g. an IEP reaching full Approved status.
- **Reference layout** (wireframed and approved during planning): a dashboard listing each student's IEP as a card — student name, program, current version/stage badge, and a horizontal stage tracker (Draft → Submitted → In review → Revisions needed → Approved) with the active/most-relevant stage highlighted in color; red for a card in Revisions Needed, green throughout once Approved. An upload dropzone sits above the list. This is the reference for the "Upload + status pipeline" screen only — the Coordinator approval queue, Therapist view, and the document review/annotation view still need to be wireframed before building those.

## Suggested tech stack

Optimized for a small private-school deployment, one team building it, and heavy Word-document handling:

- **Framework**: Next.js (React) — single codebase for frontend + API routes, fastest path to build incrementally with Claude Code.
- **Auth**: Auth.js (NextAuth) with Google provider, restricted to the school's Workspace domain.
- **Database**: PostgreSQL (via Prisma ORM) — good fit for roles, approval workflow, versioned documents, threaded comments, and audit logs.
- **File storage**: S3-compatible bucket (or Supabase Storage) for uploaded/generated Word files.
- **Document parsing/generation**: Node `docx` library to generate the comment-embedded Word export; `mammoth` or `officeparser` to read uploaded `.docx` files into structured section data.
- **AI review**: Claude API (Anthropic) for the review analysis itself — grounded per-request with student diagnosis, program, and the relevant IEP section.
- **Hosting**: Vercel (pairs naturally with Next.js) or the school's existing infra if there's a preference.

This is a starting suggestion, not a fixed decision — worth confirming once you're inside Claude Code and can see what's easiest to scaffold.

## MVP feature list

- Google Workspace sign-in, self-select + admin-approved roles
- Upload/update an IEP (Word)
- Parse into the real document sections
- AI review with inline highlights + recommendations, calibrated to program
- Coordinator approval queue for higher-stakes flags
- Manual highlight + threaded comments for Coordinators/Admins/Therapists, visually distinct from AI flags
- Two-stage approval (Coordinator, then any Admin title) with the approving title recorded
- Status pipeline visible per IEP (Draft / Submitted vN / In Review vN / Revisions Needed vN / Approved)
- Action history, scoped by role
- Export a Word file with all comments embedded

### Later

- Explicit "Program" field instead of inferring from checkboxes
- Sync teacher replies made inside Word back into the app's comment threads
- In-app editing (replace the download/re-upload loop) once a Word-template-faithful editor is feasible
- Coordinator/Admin dashboards across teachers and quarters
- Department-level analytics (recurring issues, turnaround time)
- Coaching insights — recurring issues by teacher, surfaced privately

## Open questions to resolve during build

1. **Program source of truth** — infer from service checkboxes, or track separately?
2. **Re-review scope** — when a teacher re-uploads for a new quarter, re-check the whole document or just what changed?
3. **Teacher-initiated comments** — can teachers start their own comment threads (e.g. to ask the Coordinator a question), or only reply within existing ones?
