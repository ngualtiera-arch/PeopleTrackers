import { prisma, Prisma } from '@peopletrackers/db';
import {
  resolvePackageCode,
  resolveRates,
  resolveFee,
  resolveAmount,
  resolveDefaultDueDate,
  shouldStampDateClosed,
  type PackageCode,
  type CaseTypeCode,
  type CaseStatusCode,
  type caseCreateSchema,
  type caseUpdateSchema,
} from '@peopletrackers/shared';
import type { z } from 'zod';
import { caseTypeIdFor, caseStatusIdFor, packageIdFor } from '../lib/reference-lookup.js';
import { loadDefaultsSettings } from '../lib/settings.js';

type CaseCreateInput = z.infer<typeof caseCreateSchema>;
type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

type CaseWithRelations = Prisma.CaseGetPayload<{
  include: { client: { include: { package: true } }; caseType: true; status: true };
}>;

/**
 * §6.1 Case defaults on create. Package/rate/fee resolution always runs fresh for a new case —
 * there's no "existing value" to decide whether to overwrite yet.
 */
export async function computeCreateFields(
  input: CaseCreateInput,
  userId: string | undefined,
): Promise<Prisma.CaseUncheckedCreateInput> {
  const client = await prisma.client.findUnique({ where: { id: input.clientId }, include: { package: true } });
  if (!client) throw new Error('Client not found.');

  const caseTypeCode: CaseTypeCode = input.caseTypeCode ?? 'skip_tracing';
  const statusCode: CaseStatusCode = input.statusCode ?? 'new_instruction';
  const defaults = await loadDefaultsSettings();

  const clientPackageCode = (client.package?.code ?? null) as PackageCode | null;
  const packageCode = resolvePackageCode(clientPackageCode, caseTypeCode);
  const rates = resolveRates(packageCode, caseTypeCode);
  const units = input.units ?? 1;
  const fee = resolveFee(statusCode, rates.rateLocate, rates.rateNonLocate);
  const amount = resolveAmount(fee, units);

  const dateEntered = new Date();
  const dateDue = input.dateDue ? new Date(input.dateDue) : resolveDefaultDueDate(dateEntered);

  const [caseTypeId, statusId, packageId] = await Promise.all([
    caseTypeIdFor(caseTypeCode),
    caseStatusIdFor(statusCode),
    packageCode ? packageIdFor(packageCode) : Promise.resolve(null),
  ]);

  return {
    clientId: input.clientId,
    agentId: input.agentId ?? defaults.defaultAgentId ?? null,
    caseTypeId,
    statusId,
    packageId,
    clientRef: input.clientRef,
    rateLocate: rates.rateLocate,
    rateNonLocate: rates.rateNonLocate,
    fee,
    units,
    amount,
    dateEntered,
    dateDue,
    reportSent: input.reportSent ?? false,
    invoiced: input.invoiced ?? false,

    subjectTitle: input.subjectTitle,
    subjectFirstname: input.subjectFirstname,
    subjectMiddlename: input.subjectMiddlename,
    subjectLastname: input.subjectLastname,
    subjectGender: input.subjectGender,
    subjectDob: input.subjectDob ? new Date(input.subjectDob) : null,
    subjectLicence: input.subjectLicence,
    subjectPhHome: input.subjectPhHome,
    subjectPhMobile: input.subjectPhMobile,
    subjectPhWork: input.subjectPhWork,
    subjectPhOther: input.subjectPhOther,

    confirmedAddr1: input.confirmedAddr1,
    confirmedAddr2: input.confirmedAddr2,
    confirmedCity: input.confirmedCity,
    confirmedState: input.confirmedState,
    confirmedPostcode: input.confirmedPostcode,
    confirmedCountry: input.confirmedCountry,

    lastKnownAddr1: input.lastKnownAddr1,
    lastKnownAddr2: input.lastKnownAddr2,
    lastKnownCity: input.lastKnownCity,
    lastKnownState: input.lastKnownState,
    lastKnownPostcode: input.lastKnownPostcode,
    lastKnownCountry: input.lastKnownCountry,

    employer: input.employer,
    employerAddr1: input.employerAddr1,
    employerAddr2: input.employerAddr2,
    employerCity: input.employerCity,
    employerState: input.employerState,
    employerPostcode: input.employerPostcode,
    employerCountry: input.employerCountry,
    employerPhone: input.employerPhone,
    employerFax: input.employerFax,

    additionalInfo: input.additionalInfo,
    agentNotes: input.agentNotes,
    report: input.report,

    createdBy: userId,
    updatedBy: userId,
  };
}

/**
 * §6.2-§6.5 update rules. Recompute happens ONLY when the field that triggers it is actually
 * present in this update's payload (or a field it depends on was) — matching the source's
 * "whenever X changes" semantics, not "every time the record is saved". A manual edit to
 * rate/fee/amount that isn't accompanied by a trigger field change is saved as given.
 */
export async function computeUpdateFields(
  existing: CaseWithRelations,
  input: CaseUpdateInput,
  userId: string | undefined,
): Promise<Prisma.CaseUncheckedUpdateInput> {
  const fields: Prisma.CaseUncheckedUpdateInput = { updatedBy: userId };

  // Plain pass-through fields — only touched if present in the payload.
  const passThrough = [
    'clientRef',
    'subjectTitle',
    'subjectFirstname',
    'subjectMiddlename',
    'subjectLastname',
    'subjectGender',
    'subjectLicence',
    'subjectPhHome',
    'subjectPhMobile',
    'subjectPhWork',
    'subjectPhOther',
    'confirmedAddr1',
    'confirmedAddr2',
    'confirmedCity',
    'confirmedState',
    'confirmedPostcode',
    'confirmedCountry',
    'lastKnownAddr1',
    'lastKnownAddr2',
    'lastKnownCity',
    'lastKnownState',
    'lastKnownPostcode',
    'lastKnownCountry',
    'employer',
    'employerAddr1',
    'employerAddr2',
    'employerCity',
    'employerState',
    'employerPostcode',
    'employerCountry',
    'employerPhone',
    'employerFax',
    'additionalInfo',
    'agentNotes',
    'report',
    'reportSent',
    'invoiced',
    'agentId',
  ] as const satisfies readonly (keyof CaseUpdateInput)[];

  for (const key of passThrough) {
    if (key in input) {
      (fields as Record<string, unknown>)[key] = input[key];
    }
  }

  if ('subjectDob' in input) {
    fields.subjectDob = input.subjectDob ? new Date(input.subjectDob) : null;
  }
  if ('dateDue' in input) {
    fields.dateDue = input.dateDue ? new Date(input.dateDue) : null;
  }

  const clientChanged = 'clientId' in input && input.clientId !== existing.clientId;
  const caseTypeChanged = 'caseTypeCode' in input && input.caseTypeCode !== existing.caseType.code;

  if (clientChanged) fields.clientId = input.clientId;

  // §6.2/§6.3 — package + rate resolution, re-run whenever client_id or case_type_id changes.
  let effectiveRateLocate = existing.rateLocate ? Number(existing.rateLocate) : 0;
  let effectiveRateNonLocate = existing.rateNonLocate ? Number(existing.rateNonLocate) : 0;
  let rateWasRecomputed = false;

  if (clientChanged || caseTypeChanged) {
    const effectiveCaseTypeCode = (input.caseTypeCode ?? existing.caseType.code) as CaseTypeCode;
    const effectiveClientId = input.clientId ?? existing.clientId;
    const client = await prisma.client.findUnique({ where: { id: effectiveClientId }, include: { package: true } });
    if (!client) throw new Error('Client not found.');

    const clientPackageCode = (client.package?.code ?? null) as PackageCode | null;
    const packageCode = resolvePackageCode(clientPackageCode, effectiveCaseTypeCode);
    const rates = resolveRates(packageCode, effectiveCaseTypeCode);

    fields.packageId = packageCode ? await packageIdFor(packageCode) : null;
    fields.rateLocate = rates.rateLocate;
    fields.rateNonLocate = rates.rateNonLocate;
    effectiveRateLocate = rates.rateLocate;
    effectiveRateNonLocate = rates.rateNonLocate;
    rateWasRecomputed = true;

    if (caseTypeChanged) {
      fields.caseTypeId = await caseTypeIdFor(effectiveCaseTypeCode);
    }
  }

  // A manual rate edit not accompanied by a client/case-type change — apply as given.
  if (!rateWasRecomputed) {
    if ('rateLocate' in input) {
      fields.rateLocate = input.rateLocate;
      effectiveRateLocate = input.rateLocate ?? 0;
    }
    if ('rateNonLocate' in input) {
      fields.rateNonLocate = input.rateNonLocate;
      effectiveRateNonLocate = input.rateNonLocate ?? 0;
    }
  }

  const statusChanged = 'statusCode' in input && input.statusCode !== existing.status.code;
  const effectiveStatusCode = (input.statusCode ?? existing.status.code) as CaseStatusCode;
  // units is NOT NULL in the DB (default 1) — a cleared field (null) reverts to 1 rather than
  // being written through as null, which Prisma would reject.
  const effectiveUnits = input.units ?? Number(existing.units);

  if (statusChanged) {
    fields.statusId = await caseStatusIdFor(effectiveStatusCode);
  }
  if ('units' in input) {
    fields.units = input.units ?? 1;
  }

  // §6.4 — fee/amount recompute whenever status_id, rate_locate, rate_non_locate or units changes.
  const feeTriggered = statusChanged || rateWasRecomputed || 'rateLocate' in input || 'rateNonLocate' in input || 'units' in input;
  if (feeTriggered) {
    const fee = resolveFee(effectiveStatusCode, effectiveRateLocate, effectiveRateNonLocate);
    fields.fee = fee;
    fields.amount = resolveAmount(fee, effectiveUnits);
  } else {
    // No trigger fired — a direct manual edit to fee/amount is still honoured (§6.4 lists both as editable).
    if ('fee' in input) fields.fee = input.fee;
    if ('amount' in input) fields.amount = input.amount;
  }

  // §6.5 — status change side effect.
  if (statusChanged && shouldStampDateClosed(effectiveStatusCode)) {
    fields.dateClosed = new Date();
  }

  return fields;
}
