# People Trackers Australia — Investigation & Case Management System

V1 rebuild of the existing FileMaker system. `docs/PeopleTrackers_V1_Build_Specification.md` is
the source of truth for everything this application does — read it before changing business logic.

## Structure

```
apps/web       React + TS + Vite + Tailwind frontend
apps/api       Fastify + TS REST backend
packages/db    Prisma schema (spec §5), seed script (spec §7)
packages/shared  Reference data, business constants, shared DTOs — single source of truth
reports/       Case report templates (Phase 4) — Client/Agent report templates live in apps/api/src/reports
scripts/load   One-off client/agent CSV load (spec §8)
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

**Phases 1 (Foundations) and 2 (Clients & Agents) complete**, verified end-to-end against a
live Supabase Postgres instance (ap-southeast-2, via the session pooler — the direct
`db.*.supabase.co` host is IPv6-only and unreachable from IPv4-only networks; use the pooler
connection string from Project Settings → Database).

**Phase 1:** schema, seed (reference data + §2.2 settings — confirmed branding only, no ACN,
no iTrace anything), auth (Argon2id + JWT, secure-by-default route guard, admin/staff roles),
app shell, keyboard layer.

**Phase 2:** the real client/agent CSV load (`scripts/load`) — every number in spec §8.5/§8.6
confirmed exactly against the loaded data (689/35 records, reference ranges, needs_review
breakdown, agent skill split, standard-package count); full CRUD API with Find ("begins with
per word") and the needs-review filter; Clients and Agents list/detail screens with Prev/Next;
and all six Client/Agent report outputs (Details, List, Envelope × 2) rendered via Playwright,
letterhead/footer pulled from Settings, verified by generating and visually inspecting real
PDFs against live data.

Several real bugs were found and fixed by actually exercising the app end-to-end (browser +
generated PDFs), not just from code review or `curl`: a CORS `methods` gap that silently broke
every edit/delete in the browser, an empty-body `Content-Type` header that 400'd every delete,
a search bug that only matched the start of a field instead of any word in it, and a PDF
envelope orientation bug where `landscape: true` double-flipped already-landscape explicit
dimensions into a tall portrait page.

**Known gaps carried forward:** the report letterhead logo is a placeholder (§22, not yet
supplied); the envelope page size is an unverified DL default (D14, no sample was supplied to
check it against).

**Not yet built:** Cases (Phase 3), the five case report outputs and Batch PDF (Phase 4),
email (Phase 5), Settings UI / hardening (Phase 6).

See `docs/PeopleTrackers_V1_Build_Specification.md` §23 for the full phase plan.
