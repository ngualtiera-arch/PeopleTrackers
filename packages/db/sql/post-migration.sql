-- Hand-written raw SQL, applied AFTER `prisma migrate dev` has created the base tables
-- from schema.prisma. Covers everything Prisma's schema language cannot express:
-- functional indexes, the tsvector trigger, and the D9/§8.6 sequence starting values.
--
-- Run once against a fresh database:
--   psql "$DATABASE_URL" -f packages/db/sql/post-migration.sql

-- §5 "Indexes" — functional indexes not expressible in schema.prisma
create index if not exists cases_lower_subject_lastname_idx on cases (lower(subject_lastname));
create index if not exists clients_lower_company_idx on clients (lower(company));
create index if not exists agents_lower_name_idx on agents (lower(name));
create index if not exists cases_search_vector_idx on cases using gin (search_vector);

-- Maintain cases.search_vector from the fields Find/§12.1 needs to match ("begins with" per word,
-- reproduced here via to_tsvector + prefix tsquery at query time). 'simple' config: no stemming,
-- so reference numbers and names aren't mangled by English stemming rules.
create or replace function cases_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.reference::text, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.client_ref, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.subject_firstname, '') || ' ' ||
                                     coalesce(new.subject_middlename, '') || ' ' ||
                                     coalesce(new.subject_lastname, '')), 'A');
  return new;
end;
$$ language plpgsql;

drop trigger if exists cases_search_vector_trigger on cases;
create trigger cases_search_vector_trigger
  before insert or update on cases
  for each row execute function cases_search_vector_update();

-- D9 / §8.6 — reference sequence starting values.
-- Prisma names the autoincrement sequence <table>_<column>_seq by default.
-- Cases: no historical cases are loaded (D3), so the sequence starts at the first reference itself.
alter sequence cases_reference_seq restart with 55982;

-- Clients and agents: the load script (scripts/load) inserts the 689/35 historical records with their
-- original `reference` values explicitly, which does NOT advance a Postgres identity sequence. These two
-- lines must run AFTER the load, not before — restarting a sequence a loaded row already passed would
-- collide on the next insert. See scripts/load/README.md.
-- alter sequence clients_reference_seq restart with 2716;
-- alter sequence agents_reference_seq restart with 1159;
