# I-CARe — IEP Review Assistant

A review tool for the CARe (SPED) department at Holy Child Jesus Montessori School of Dasmariñas. Teachers connect an IEP (Google Doc or Word upload), the app parses it into its standard sections and runs an AI review calibrated to the student's program, and Academic Coordinators / School Admins give two-stage approval before it's final. The tool never writes back to the source document — teachers stay the author.

See [`CLAUDE.md`](./CLAUDE.md) for the full project brief (roles, programs, review standard, workflow).

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Auth**: NextAuth v5, Credentials provider (school accounts, admin-approved roles)
- **Database**: PostgreSQL via Supabase, Prisma 7 (driver-adapter pattern — generated client lives at `app/generated/prisma`, not `@prisma/client`)
- **File storage**: Cloudflare R2 (S3-compatible)
- **Google Docs ingestion**: a Google Apps Script web app bridge (`apps-script/`) restricted to an approved Drive folder — see `docs/google-docs-bridge-*.md`
- **Word ingestion**: `mammoth`
- **Parser**: shared section detector (`lib/parser/`) — both ingestion paths normalize to the same HTML and converge on one `detectSections()`
- **AI review**: Groq, a 5-layer developmental/educational review framework with program-specific rubrics (`lib/ai/`)

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run db:migrate           # apply schema to your database
npm run db:seed              # seeds the bootstrap School Admin
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate` first via `postinstall`) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the bootstrap admin account |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

Deployed on Vercel. All environment variables in `.env.example` must be set in the Vercel project settings — never commit real values. `GOOGLE_DOC_BRIDGE_MODE` must be `apps-script` in production (it defaults to a no-network `mock` mode otherwise).
