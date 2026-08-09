import type { Case } from '@peopletrackers/shared';

interface RefRow {
  id: string;
  code: string;
  name: string;
}

export interface CaseWithRelations extends Omit<Case, 'clientId' | 'agentId' | 'caseTypeCode' | 'statusCode' | 'packageCode'> {
  client: { id: string; reference: number; company: string | null; contactName: string | null };
  agent: { id: string; reference: number; name: string | null } | null;
  caseType: RefRow;
  status: RefRow & { sortOrder: number; feeRule: string };
  package: RefRow | null;
}

export interface CaseListResponse {
  items: CaseWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}
