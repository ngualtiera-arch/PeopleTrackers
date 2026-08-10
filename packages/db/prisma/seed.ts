import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import {
  PACKAGES,
  CASE_TYPES,
  CASE_STATUSES,
  REPORT_TEMPLATES,
  CONFIRMED_BUSINESS_DETAILS,
  DEFAULT_DAYS_UNTIL_DUE,
} from '@peopletrackers/shared';
import { TEMPLATE_BODIES } from './template-bodies.js';

const prisma = new PrismaClient();

async function seedReferenceData() {
  for (const p of PACKAGES) {
    await prisma.package.upsert({
      where: { code: p.code },
      update: { name: p.name, locateRate: p.locateRate, nonLocateRate: p.nonLocateRate, sortOrder: p.sortOrder },
      create: { code: p.code, name: p.name, locateRate: p.locateRate, nonLocateRate: p.nonLocateRate, sortOrder: p.sortOrder },
    });
  }

  for (const t of CASE_TYPES) {
    await prisma.caseType.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        usesPackage: t.usesPackage,
        locateRate: t.locateRate,
        nonLocateRate: t.nonLocateRate,
        sortOrder: t.sortOrder,
      },
      create: {
        code: t.code,
        name: t.name,
        usesPackage: t.usesPackage,
        locateRate: t.locateRate,
        nonLocateRate: t.nonLocateRate,
        sortOrder: t.sortOrder,
      },
    });
  }

  for (const s of CASE_STATUSES) {
    await prisma.caseStatus.upsert({
      where: { code: s.code },
      update: { name: s.name, sortOrder: s.sortOrder, feeRule: s.feeRule },
      create: { code: s.code, name: s.name, sortOrder: s.sortOrder, feeRule: s.feeRule },
    });
  }

  // Bodies extracted from the supplied sample report PDFs — see template-bodies.ts for
  // per-template confidence notes. `process_service` has no sample and stays empty pending
  // real content (§22). `update: body` so re-running the seed refreshes content if this file
  // changes, rather than only applying on first insert.
  for (const t of REPORT_TEMPLATES) {
    const body = TEMPLATE_BODIES[t.code] ?? '';
    await prisma.reportTemplate.upsert({
      where: { code: t.code },
      update: { body },
      create: { code: t.code, name: t.buttonLabel, body },
    });
  }
}

// `update` mirrors `create` for every Setting below — matching the report_templates fix
// above, so that re-running the seed after editing a default here actually refreshes it,
// rather than only applying on first insert. Fine pre-launch, where this script is the only
// thing writing these rows; it must NOT be re-run against a live production DB once the
// Settings screen (Phase 6) lets an admin edit these for real — that would silently overwrite
// their changes.
async function seedSettings() {
  const company = {
    legalName: CONFIRMED_BUSINESS_DETAILS.legalName,
    tradingAs: CONFIRMED_BUSINESS_DETAILS.tradingAs,
    abn: CONFIRMED_BUSINESS_DETAILS.abn,
    secondaryAbn: CONFIRMED_BUSINESS_DETAILS.secondaryAbn,
    acn: CONFIRMED_BUSINESS_DETAILS.acn,
    email: CONFIRMED_BUSINESS_DETAILS.email,
    website: CONFIRMED_BUSINESS_DETAILS.website,
    additionalWebsite: CONFIRMED_BUSINESS_DETAILS.additionalWebsite,
    postalAddress: CONFIRMED_BUSINESS_DETAILS.postalAddress,
    contactNumber: CONFIRMED_BUSINESS_DETAILS.contactNumber,
    confidentialityLine: CONFIRMED_BUSINESS_DETAILS.confidentialityLine,
    officeByAppointmentLine: CONFIRMED_BUSINESS_DETAILS.officeByAppointmentLine,
    logoUrl: null, // supplied per §22, not yet available
  };
  await prisma.setting.upsert({
    where: { key: 'company' },
    update: { value: company },
    create: { key: 'company', value: company },
  });

  const defaults = {
    defaultAgentId: null, // source hard-codes one agent — set once agents are loaded (§6.1)
    defaultCaseType: 'skip_tracing',
    defaultStatus: 'new_instruction',
    daysUntilDue: DEFAULT_DAYS_UNTIL_DUE,
  };
  await prisma.setting.upsert({
    where: { key: 'defaults' },
    update: { value: defaults },
    create: { key: 'defaults', value: defaults },
  });

  const email = {
    provider: null, // deployment configuration item — D6, §14.3
    sendingDomain: null,
    fromAddress: null,
    replyTo: null,
    // Emailing a report is new functionality (§14.1: "The existing system cannot email a
    // report") — there's no existing wording to reproduce, so this is a sensible editable
    // default, not a captured verbatim text like the report templates.
    reportEmailSubject: 'Your report — {case_reference}',
    reportEmailBody:
      'Dear {client_contact_name},\n\nPlease find attached our report regarding {subject_full_name} (Our Ref: {case_reference}, Your Ref: {client_ref}).\n\nIf you have any queries regarding this report, please do not hesitate to contact our office.\n\nKind regards,\nPeople Trackers Australia',
    // Opening line is spec-given verbatim (§14.2); subject details are appended at send time.
    agentInstructionSubject: 'Agent Instruction : {case_reference}',
    agentInstructionBody: 'Hi {agent_first_name},\n\nPlease attempt to locate the following subject',
  };
  await prisma.setting.upsert({
    where: { key: 'email' },
    update: { value: email },
    create: { key: 'email', value: email },
  });
}

async function seedSequences() {
  // Case reference sequence starts at 55982 regardless of load state — D9. Client/agent sequence
  // restarts happen after the client/agent load script runs (see packages/db/sql/post-migration.sql).
  await prisma.$executeRawUnsafe(`alter sequence cases_reference_seq restart with 55982;`);
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user creation.');
    console.log('Set both env vars and re-run `npm run db:seed` to create the first Admin login.');
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Admin', role: 'admin', isActive: true },
  });
  console.log(`Admin user ensured for ${email}.`);
}

async function main() {
  await seedReferenceData();
  await seedSettings();
  await seedSequences();
  await seedAdminUser();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
