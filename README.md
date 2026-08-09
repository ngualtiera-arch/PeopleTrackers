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
- a free-tier Supabase project's connection string, pointed at from `.env`.

```bash
cp packages/db/.env.example packages/db/.env    # edit DATABASE_URL
npm run db:migrate                              # creates tables from prisma/schema.prisma
psql "$DATABASE_URL" -f packages/db/sql/post-migration.sql   # functional indexes, tsvector trigger, sequence start values
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npm run db:seed
```

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

Phase 1 (Foundations) scaffold — schema, seed, auth, app shell, keyboard layer, main menu.

Verified so far: every workspace typechecks clean, `prisma generate` runs against the schema,
the web app builds and was exercised in a real browser (login form, redirect-when-unauthenticated,
error display), and the API was booted and exercised with curl — public routes, the
secure-by-default auth guard (401 on protected routes without a session), Zod validation errors
(400 with field-level issues), and a sanitized 500 response with no internal detail leaked on an
unexpected failure (verified against a real DB-connection error).

**Not yet verified: migrations and the seed script against a live Postgres.** No Docker/Postgres
was available in the environment this repo was scaffolded in — `npm run db:migrate` and
`npm run db:seed` need to be run against a real instance before Phase 1 is fully signed off.

See `docs/PeopleTrackers_V1_Build_Specification.md` §23 for the full phase plan.
