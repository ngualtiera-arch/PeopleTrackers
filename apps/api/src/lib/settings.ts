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
