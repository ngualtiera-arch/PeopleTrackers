import type { Client } from '@peopletrackers/shared';

export interface ClientWithPackage extends Client {
  package: { id: string; code: string; name: string } | null;
}

export interface ClientListResponse {
  items: ClientWithPackage[];
  total: number;
  page: number;
  pageSize: number;
}
