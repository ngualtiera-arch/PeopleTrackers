# People Trackers Australia — Investigation & Case Management System

V1 rebuild of the existing FileMaker system. `docs/PeopleTrackers_V1_Build_Specification.md` is
the source of truth for everything this application does — read it before changing business logic.

## Structure

```
apps/web       React + TS + Vite + Tailwind frontend
apps/api       Fastify + TS REST backend
packages/db    Prisma schema (spec §5), seed script (spec §7)
packages/shared  Reference data, business constants, shared DTOs — single source of truth
reports/       HTML/CSS report templates (Phase 4)
scripts/load   One-off client/agent CSV load (spec §8, Phase 2 — not yet implemented)
docs/          The build specification and reverse-engineering report
```

## Local development

Requires Node 20+, and a Postgres instance.

```bash
npm install
```

### Database

You need a running Postgres reachable from `DATABASE_URL`. Either:

- `docker compose up -d` (requires Docker Desktop — not installed in the environment this repo
  was scaffolded in), or
- a local Postgres install, or
- a Supabase project's connection string, pointed at from `.env`.

**Supabase gotcha:** the direct `db.<ref>.supabase.co:5432` host is IPv6-only. If you're on a
network without IPv6 (`P1001: Can't reach database server`), use the **session pooler**
connection string instead (Project Settings → Database → Connection string → "Session pooler"),
which is IPv4: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.

```bash
cp packages/db/.env.example packages/db/.env    # edit DATABASE_URL
npm run db:migrate                              # creates tables from prisma/schema.prisma
npx prisma db execute --schema packages/db/prisma/schema.prisma --file packages/db/sql/post-migration.sql
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npm run db:seed
```

(`prisma db execute` works without a local `psql` install — use it in place of `psql -f` if
you don't have the Postgres client tools.)

### API

```bash
cp apps/api/.env.example apps/api/.env   # edit JWT secrets — generate with: openssl rand -base64 48
npm run dev:api                          # http://localhost:4000
```

### Web

```bash
cp apps/web/.env.example apps/web/.env
npm run dev:web                          # http://localhost:5173
```

## Status

**Phase 1 (Foundations) complete and verified end-to-end against a live Supabase Postgres
instance** (ap-southeast-2, via the session pooler — the direct `db.*.supabase.co` host is
IPv6-only and unreachable from IPv4-only networks; use the pooler connection string from
Project Settings → Database).

Verified: migration applied cleanly (`packages/db/prisma/migrations/`), `post-migration.sql`
applied (functional indexes, tsvector trigger, `cases_reference_seq` confirmed sitting at
55982 per D9), seed produced the exact §7 reference data (5 packages, 4 case types, 7
statuses with correct fee rules, 5 report templates) and the §2.2 settings (confirmed
branding only — no ACN, no iTrace anything). A real admin login was exercised through the
browser: sign-in, JWT cookies issued, redirect to main menu, role-gated Settings endpoint
returned the correct data. All workspaces typecheck clean; the web app builds; the API's
secure-by-default auth guard, Zod validation (400s), and sanitized error responses (no
internals leaked on unexpected failures) were all exercised directly.

**Not yet built:** the client/agent CSV load script (`scripts/load`) is a stub — real
implementation is Phase 2 scope (§23).

See `docs/PeopleTrackers_V1_Build_Specification.md` §23 for the full phase plan.
