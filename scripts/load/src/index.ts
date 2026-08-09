/**
 * One-off client/agent load — spec §8. Reads the read-only CSV exports, applies the
 * field mapping (§8.2/§8.3, see columns.ts) and transformations (§8.4), and upserts
 * keyed on `reference` so the load is idempotent and re-runnable (§8.8).
 *
 * Does NOT de-duplicate, merge, delete or correct records — D11.
 *
 * Usage:
 *   npm run load:clients-agents
 *   npm run load:clients-agents -- --clients /path/to/export_clients.csv --agents /path/to/export_agents.csv
 */
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prisma } from '@peopletrackers/db';
import { AGENT_SKILLS, type AgentSkillCode } from '@peopletrackers/shared';
import { CLIENT_COLUMNS, CLIENT_COLUMN_COUNT, AGENT_COLUMNS, AGENT_COLUMN_COUNT } from './columns.js';
import {
  cleanLine,
  cleanMultiline,
  normalizeState,
  parseDate,
  parseDateTime,
  parseDecimal,
  isValidEmail,
  splitSkills,
} from './transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const SOURCE_ROOT = path.resolve(REPO_ROOT, '..'); // the Downloads/Nicole folder containing the raw exports

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const CLIENTS_CSV = argValue('--clients') ?? path.join(SOURCE_ROOT, 'export_clients.csv');
const AGENTS_CSV = argValue('--agents') ?? path.join(SOURCE_ROOT, 'export_agents.csv');

const SKILL_NAME_TO_CODE = new Map<string, AgentSkillCode>(AGENT_SKILLS.map((s) => [s.name, s.code]));

function readRows(csvPath: string, expectedColumns: number): string[][] {
  const raw = readFileSync(csvPath, 'utf-8');
  const rows: string[][] = parse(raw, { columns: false, relax_column_count: false });
  for (const [i, row] of rows.entries()) {
    if (row.length !== expectedColumns) {
      throw new Error(`${csvPath} row ${i + 1}: expected ${expectedColumns} columns, got ${row.length}`);
    }
  }
  return rows;
}

interface LoadedClient {
  reference: number;
  contactName: string | null;
  company: string | null;
  addr1: string | null;
  addr2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  notes: string | null;
  kind: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
  postalAddr1: string | null;
  postalAddr2: string | null;
  postalCity: string | null;
  postalState: string | null;
  postalPostcode: string | null;
  postalCountry: string | null;
  attention: string | null;
  emailInvoice: string | null;
  emailReports: string | null;
  terms: string | null;
  fileFee: number | null;
  locateFee: number | null;
  nonLocateFee: number | null;
  hourlyFee: number | null;
  abn: string | null;
  packageRaw: string | null;
  createdAt: Date | null;
  needsReview: boolean;
  reviewReasons: string[];
}

function loadClients(): LoadedClient[] {
  const rows = readRows(CLIENTS_CSV, CLIENT_COLUMN_COUNT);
  const c = CLIENT_COLUMNS;

  const clients: LoadedClient[] = rows.map((r) => {
    const country = cleanLine(r[c.country]) ?? 'Australia';
    const state = normalizeState(cleanLine(r[c.state]), country);
    const postalCountry = cleanLine(r[c.postalCountry]) ?? country;
    const postalState = normalizeState(cleanLine(r[c.postalState]), postalCountry);

    return {
      reference: Number(r[c.reference]),
      contactName: cleanLine(r[c.contactName]),
      company: cleanLine(r[c.company]),
      addr1: cleanLine(r[c.addr1]),
      addr2: cleanLine(r[c.addr2]),
      city: cleanLine(r[c.city]),
      state,
      postcode: cleanLine(r[c.postcode]),
      country,
      phone: cleanLine(r[c.phone]),
      fax: cleanLine(r[c.fax]),
      email: cleanLine(r[c.email]),
      notes: cleanMultiline(r[c.notes]),
      kind: cleanLine(r[c.kind]),
      updatedBy: cleanLine(r[c.updatedBy]),
      updatedAt: parseDateTime(cleanLine(r[c.updatedAt])),
      postalAddr1: cleanLine(r[c.postalAddr1]),
      postalAddr2: cleanLine(r[c.postalAddr2]),
      postalCity: cleanLine(r[c.postalCity]),
      postalState,
      postalPostcode: cleanLine(r[c.postalPostcode]),
      postalCountry,
      attention: cleanLine(r[c.attention]),
      emailInvoice: cleanLine(r[c.emailInvoice]),
      emailReports: cleanLine(r[c.emailReports]),
      terms: cleanLine(r[c.terms]),
      fileFee: parseDecimal(r[c.fileFee]),
      locateFee: parseDecimal(r[c.locateFee]),
      nonLocateFee: parseDecimal(r[c.nonLocateFee]),
      hourlyFee: parseDecimal(r[c.hourlyFee]),
      abn: cleanLine(r[c.abn]),
      packageRaw: cleanLine(r[c.package]),
      createdAt: parseDate(cleanLine(r[c.createdAt])),
      needsReview: false,
      reviewReasons: [],
    };
  });

  // §8.5 needs_review — informational only, D11 (no correction).
  const companyCounts = new Map<string, number>();
  for (const cl of clients) {
    if (cl.company) {
      const key = cl.company.trim().toLowerCase();
      companyCounts.set(key, (companyCounts.get(key) ?? 0) + 1);
    }
  }

  for (const cl of clients) {
    if (!cl.company && !cl.contactName) cl.reviewReasons.push('blank company and contact name');
    if (cl.reference === 2557 || cl.reference === 2715) cl.reviewReasons.push('essentially empty record');
    if (cl.company && (companyCounts.get(cl.company.trim().toLowerCase()) ?? 0) > 1) {
      cl.reviewReasons.push('shares company name with another client');
    }
    if (cl.packageRaw && cl.packageRaw.toLowerCase() !== 'standard') {
      cl.reviewReasons.push(`invalid package "${cl.packageRaw}"`);
    }
    if (!isValidEmail(cl.email)) cl.reviewReasons.push('invalid email');
    if (!isValidEmail(cl.emailInvoice)) cl.reviewReasons.push('invalid email_invoice');
    if (!isValidEmail(cl.emailReports)) cl.reviewReasons.push('invalid email_reports');
    cl.needsReview = cl.reviewReasons.length > 0;
  }

  return clients;
}

interface LoadedAgent {
  reference: number;
  name: string | null;
  company: string | null;
  addr1: string | null;
  addr2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  notes: string | null;
  rate: number | null;
  skills: AgentSkillCode[];
  updatedBy: string | null;
  updatedAt: Date | null;
  createdAt: Date | null;
  needsReview: boolean;
  reviewReasons: string[];
}

function loadAgents(): LoadedAgent[] {
  const rows = readRows(AGENTS_CSV, AGENT_COLUMN_COUNT);
  const c = AGENT_COLUMNS;

  return rows.map((r) => {
    const country = cleanLine(r[c.country]);
    const state = normalizeState(cleanLine(r[c.state]), country);

    const skillNames = splitSkills(r[c.skills]);
    const skills = skillNames
      .map((name) => SKILL_NAME_TO_CODE.get(name))
      .filter((code): code is AgentSkillCode => Boolean(code));
    const unmappedSkills = skillNames.filter((name) => !SKILL_NAME_TO_CODE.has(name));

    const name = cleanLine(r[c.name]);
    const reviewReasons: string[] = [];
    if (!name) reviewReasons.push('blank name');
    if (unmappedSkills.length > 0) reviewReasons.push(`unrecognised skill value: ${unmappedSkills.join(', ')}`);

    return {
      reference: Number(r[c.reference]),
      name,
      company: cleanLine(r[c.company]),
      addr1: cleanLine(r[c.addr1]),
      addr2: cleanLine(r[c.addr2]),
      city: cleanLine(r[c.city]),
      state,
      postcode: cleanLine(r[c.postcode]),
      country,
      phone: cleanLine(r[c.phone]),
      mobile: cleanLine(r[c.mobile]),
      fax: cleanLine(r[c.fax]),
      email: cleanLine(r[c.email]),
      notes: cleanMultiline(r[c.notes]),
      rate: parseDecimal(r[c.rate]),
      skills,
      updatedBy: cleanLine(r[c.updatedBy]),
      updatedAt: parseDateTime(cleanLine(r[c.updatedAt])),
      createdAt: parseDate(cleanLine(r[c.createdAt])),
      needsReview: reviewReasons.length > 0,
      reviewReasons,
    };
  });
}

async function upsertClients(clients: LoadedClient[]) {
  const standardPackage = await prisma.package.findUnique({ where: { code: 'standard' } });

  for (const cl of clients) {
    const packageId = cl.packageRaw?.toLowerCase() === 'standard' ? standardPackage?.id ?? null : null;

    // Built once and used for both create and update, so re-running the load after fixing a
    // mapping bug actually corrects previously-loaded rows instead of silently leaving them wrong.
    const fields = {
      reference: cl.reference,
      contactName: cl.contactName,
      company: cl.company,
      addr1: cl.addr1,
      addr2: cl.addr2,
      city: cl.city,
      state: cl.state,
      postcode: cl.postcode,
      country: cl.country ?? 'Australia',
      phone: cl.phone,
      fax: cl.fax,
      email: cl.email,
      notes: cl.notes,
      kind: cl.kind,
      postalAddr1: cl.postalAddr1,
      postalAddr2: cl.postalAddr2,
      postalCity: cl.postalCity,
      postalState: cl.postalState,
      postalPostcode: cl.postalPostcode,
      postalCountry: cl.postalCountry,
      attention: cl.attention,
      emailInvoice: cl.emailInvoice,
      emailReports: cl.emailReports,
      terms: cl.terms,
      fileFee: cl.fileFee,
      locateFee: cl.locateFee,
      nonLocateFee: cl.nonLocateFee,
      hourlyFee: cl.hourlyFee,
      abn: cl.abn,
      packageId,
      needsReview: cl.needsReview,
      createdAt: cl.createdAt ?? undefined,
      updatedAt: cl.updatedAt ?? undefined,
      updatedBy: cl.updatedBy,
    };

    await prisma.client.upsert({
      where: { reference: cl.reference },
      update: fields,
      create: fields,
    });
  }
}

async function upsertAgents(agents: LoadedAgent[]) {
  for (const a of agents) {
    const fields = {
      reference: a.reference,
      name: a.name,
      company: a.company,
      addr1: a.addr1,
      addr2: a.addr2,
      city: a.city,
      state: a.state,
      postcode: a.postcode,
      country: a.country,
      phone: a.phone,
      mobile: a.mobile,
      fax: a.fax,
      email: a.email,
      notes: a.notes,
      rate: a.rate,
      needsReview: a.needsReview,
      createdAt: a.createdAt ?? undefined,
      updatedAt: a.updatedAt ?? undefined,
      updatedBy: a.updatedBy,
    };

    const agent = await prisma.agent.upsert({
      where: { reference: a.reference },
      update: fields,
      create: fields,
    });

    // Re-runnable: clear and re-insert this agent's skills rather than accumulating duplicates.
    await prisma.agentSkill.deleteMany({ where: { agentId: agent.id } });
    if (a.skills.length > 0) {
      await prisma.agentSkill.createMany({
        data: a.skills.map((skill) => ({ agentId: agent.id, skill })),
        skipDuplicates: true,
      });
    }
  }
}

async function restartSequences(clients: LoadedClient[], agents: LoadedAgent[]) {
  const nextClientRef = Math.max(...clients.map((c) => c.reference)) + 1;
  const nextAgentRef = Math.max(...agents.map((a) => a.reference)) + 1;
  await prisma.$executeRawUnsafe(`alter sequence clients_reference_seq restart with ${nextClientRef};`);
  await prisma.$executeRawUnsafe(`alter sequence agents_reference_seq restart with ${nextAgentRef};`);
  return { nextClientRef, nextAgentRef };
}

async function main() {
  console.log(`Reading ${CLIENTS_CSV}`);
  console.log(`Reading ${AGENTS_CSV}`);

  const clients = loadClients();
  const agents = loadAgents();

  console.log(`Parsed ${clients.length} clients, ${agents.length} agents.`);

  await upsertClients(clients);
  await upsertAgents(agents);
  const { nextClientRef, nextAgentRef } = await restartSequences(clients, agents);

  // §8.7 load checklist
  const clientRefs = clients.map((c) => c.reference);
  const agentRefs = agents.map((a) => a.reference);
  const clientNeedsReview = clients.filter((c) => c.needsReview).length;
  const agentNeedsReview = agents.filter((a) => a.needsReview).length;

  console.log('\n--- Load checklist (§8.7) ---');
  console.log(`Clients: ${clients.length} parsed, references ${Math.min(...clientRefs)}-${Math.max(...clientRefs)}, next ${nextClientRef}`);
  console.log(`Agents:  ${agents.length} parsed, references ${Math.min(...agentRefs)}-${Math.max(...agentRefs)}, next ${nextAgentRef}`);
  console.log(`Clients flagged needs_review: ${clientNeedsReview}`);
  console.log(`Agents flagged needs_review: ${agentNeedsReview}`);

  const uniqueClientRefs = new Set(clientRefs);
  const uniqueAgentRefs = new Set(agentRefs);
  if (uniqueClientRefs.size !== clientRefs.length) {
    console.warn(`WARNING: duplicate client references in source (${clientRefs.length - uniqueClientRefs.size} dupes).`);
  }
  if (uniqueAgentRefs.size !== agentRefs.length) {
    console.warn(`WARNING: duplicate agent references in source (${agentRefs.length - uniqueAgentRefs.size} dupes).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
