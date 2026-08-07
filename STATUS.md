# CARe IEP Review Assistant — Status Report
_Verified against project files, 2026-07-16_

Project location: `/Users/hyznth/Desktop/CARE/`

## Purpose
Private school SPED department (CARe) needs AI-assisted IEP document review. Teachers upload `.docx` IEPs; the tool reviews and flags issues; coordinators/admins annotate and approve in two stages. Repeats quarterly.

School domain: `hcjmsdi.edu.ph` | Bootstrap admin: `thmendoza@hcjmsdi.edu.ph`

## Stack (free tiers only)
- Next.js 14 App Router + TypeScript
- Auth.js v5 (next-auth@beta) — Google OAuth, domain-restricted via `ALLOWED_DOMAIN` env var
- Prisma 7 + `@prisma/adapter-pg` (PostgreSQL via Supabase free tier)
- Cloudflare R2 — file storage (S3-compatible, 10GB free)
- Claude API `claude-sonnet-4-6` — AI review
- Vercel Hobby — hosting
- GitHub — version control (not yet initialized with commits — see below)

## Key technical notes
- Prisma 7 requires Driver Adapter pattern: `new PrismaPg({ connectionString })` passed to `PrismaClient`
- Prisma 7 generated client is at `app/generated/prisma/client.ts` (not `@prisma/client`)
- Auth split: `auth.config.ts` (edge-safe, no DB) used in middleware; `lib/auth.ts` (full, with `PrismaAdapter`) used in server components
- npm `.bin/` scripts are broken on this machine (Node 24 compat issue) — run Next.js via: `node node_modules/next/dist/bin/next dev`
- Run TypeScript via: `node node_modules/typescript/bin/tsc --noEmit`
- Dev server: `node /Users/hyznth/Desktop/CARE/node_modules/next/dist/bin/next dev --port 3001`
- `AUTH_SECRET` env var must be set before auth works (generate with: `npx auth secret`)

## Build phases status

| Phase | Scope | Status |
|---|---|---|
| **A — Foundation** | Scaffold, Prisma schema, Auth.js + domain gate, role self-select, admin approval, middleware, design tokens | ✅ **COMPLETE** — DB migrated to Supabase, bootstrap admin seeded |
| **B — File & Student Management** | Cloudflare R2 storage client, .docx upload API, student CRUD, teacher assignment, dashboard w/ StudentCard + StageTracker, Dropzone, admin/students page | ✅ **COMPLETE** |
| **C — Parse & Review UI** | mammoth integration, section detection, IepSection storage, review page with annotation rendering | ✅ **COMPLETE** — `lib/parser/mammoth.ts`, `section-detector.ts` (148 lines), review page (221 lines), `trigger-review-client.tsx`. Note: `structure-extractors.ts` (PLOP table/goals/checklist → JSON) from the original plan was **not found** as a separate file — worth verifying whether that logic was folded elsewhere or is genuinely missing. |
| **D — AI Review & Flag System** | Review orchestrator, program rubrics, stake classifier, AiFlag storage, coordinator queue, flag approve/dismiss | ✅ **COMPLETE** — `review-orchestrator.ts` (120 lines), `stake-classifier.ts`, prompts (`section-review.ts`, `consistency-check.ts`, `full-iep-review.ts`), `rubrics/index.ts`, coordinator queue page + `flag-card-client.tsx`, `api/flags/[flagId]/decide`, `api/review/[iepId]`. Note: `program-alignment.ts` prompt from the plan not found separately. |
| **E — Comments & Approvals** | Human comment/reply APIs (role-gated), CommentCard, two-stage approval, full IepStatus FSM, action history | ⬜ **NOT STARTED** — Prisma models (`Comment`, `CommentReply`, `Approval`) exist in schema, but no comment/reply APIs, no approvals API, and `lib/workflow/transitions.ts` (FSM) doesn't exist (directory absent) |
| **F — Export, Polish, Hardening** | Word export w/ embedded comments, re-upload version diff, program confirmation UI, empty states + mascot, Zod validation, responsive pass | ⬜ **NOT STARTED** — no `lib/export/`, no `lib/validation/`, no `hooks/useTextAnnotation.ts` |

## Database schema
Full Prisma schema is in place — all enums and models from the plan exist:
`Role`, `AdminTitle`, `AccountStatus`, `Program`, `ProgramConfidence`, `TherapistStatus`, `IepStatus`, `SectionType`, `FlagStake`, `FlagStatus`, `CommentStatus`, `ActionType`
`Account`, `Session`, `VerificationToken`, `User`, `Student`, `StudentTeacher`, `Iep`, `IepSection`, `AiFlag`, `Comment`, `CommentReply`, `Approval`, `ActionHistory`

## ⚠️ Version control gap
**No git commits exist yet.** `git log` returns: `fatal: your current branch 'main' does not have any commits yet` — despite Phases A–D being substantially built out (working orchestrator, parser, UI, APIs). This is a real risk: all of this work currently lives only on local disk with no history or backup.

**Recommendation:** make an initial commit before any further risky file operations on this project.

## Pre-deploy checklist
- [ ] Set `ALLOWED_DOMAIN` in `.env.local` (school's Google Workspace domain)
- [ ] Create Supabase project → get `DATABASE_URL`
- [ ] Create Cloudflare R2 bucket → get storage credentials
- [ ] Generate `AUTH_SECRET`: `npx auth secret`
- [ ] Create Google OAuth app → get `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [ ] Set `BOOTSTRAP_ADMIN_EMAIL` → run `npm run db:seed`
- [ ] Run `npm run db:migrate` to apply Prisma schema to Supabase

## Reference
Full implementation plan: `/Users/hyznth/.claude/plans/glittery-swimming-shannon.md`
