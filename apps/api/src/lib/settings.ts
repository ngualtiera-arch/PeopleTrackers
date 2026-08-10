import { prisma } from '@peopletrackers/db';

export interface DefaultsSettings {
  defaultAgentId: string | null;
  defaultCaseType: string;
  defaultStatus: string;
  daysUntilDue: number;
}

export async function loadDefaultsSettings(): Promise<DefaultsSettings> {
  const row = await prisma.setting.findUnique({ where: { key: 'defaults' } });
  return row?.value as unknown as DefaultsSettings;
}

export interface EmailSettings {
  provider: string | null;
  sendingDomain: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  reportEmailSubject: string;
  reportEmailBody: string;
  agentInstructionSubject: string;
  agentInstructionBody: string;
}

export async function loadEmailSettings(): Promise<EmailSettings> {
  const row = await prisma.setting.findUnique({ where: { key: 'email' } });
  return row?.value as unknown as EmailSettings;
}
