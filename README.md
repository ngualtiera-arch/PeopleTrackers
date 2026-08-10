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

**All 6 build phases (§23) complete** — Foundations, Clients & Agents, Cases, Reports & PDF,
Email, and Settings & hardening — every piece verified end-to-end against a live Supabase
Postgres instance (ap-southeast-2, via the session pooler — the direct `db.*.supabase.co` host
is IPv6-only and unreachable from IPv4-only networks; use the pooler connection string from
Project Settings → Database) and exercised through a real browser, not just `curl` or code
review. Remaining spec phases (§23 Phase 7 UAT, Phase 8 go-live) are Nicole/deployment
activities, not application code.

**What's built:** auth (Argon2id + JWT, secure-by-default route guard, admin/staff roles, TOTP
support, IP + per-account login rate limiting); the real client/agent CSV load (every number in
§8.5/§8.6 confirmed exactly against 689/35 loaded records); full CRUD for Clients, Agents and
Cases with Find and the four saved case filters; the complete case business-rules engine
(package/rate/fee resolution, status side effects) reproducing §6.1-§6.7 exactly; all eleven
report outputs plus Batch PDF, with letterhead/body text extracted verbatim from the supplied
sample PDFs where evidence existed; email (report-to-client and agent-instruction, capture
transport pending a real provider); and the full Settings screen (company, email templates,
defaults, read-only reference data, user management).

Roughly a dozen real bugs were found and fixed by actually running the app — a CORS `methods`
gap that silently broke every edit/delete in the browser, a PDF envelope orientation bug, a
React Query retry-storm that made every delete look like it hung for ~7 seconds, a Settings
seed that silently never updated an existing row, and others — see the git log for the full
list; each commit documents what broke and why.

**Known gaps requiring Nicole's input before go-live (not blocking, all explicitly flagged in
code):**
- Report letterhead logo — placeholder box until a URL is supplied (§22)
- Process Service report template body — no sample existed anywhere in the supplied material
- Update Report's outro paragraph — genuinely truncated in the supplied sample, rendered
  exactly as far as confirmed
- Envelope page size — unverified DL (220mm×110mm) default (D14)
- §21: ACN/secondary ABN omitted from report footers per your confirmed decision

**Go-live checklist — deployment/infra, not application code:**
- [ ] Real transactional email provider + verified sending domain (SPF/DKIM/DMARC) — D6, §14.3
- [ ] Supabase Storage — code is ready (`apps/api/src/storage/supabaseStorage.ts`), just needs
      `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` (Project Settings → API
      Keys → `service_role`) and the `case-reports` bucket created (private) in the Supabase
      dashboard's Storage section. Falls back to local disk automatically until both are set.
- [ ] Automated daily encrypted backups with a **tested** restore (§17) — Supabase-managed
- [ ] Confirm TLS/HSTS at the hosting layer (Netlify handles this by default)
- [ ] Confirm encryption at rest (Supabase-managed)
- [ ] Australian region confirmed for both Postgres and hosting

See `docs/PeopleTrackers_V1_Build_Specification.md` §23 for the full phase plan and §19 for the
full acceptance criteria checklist.
