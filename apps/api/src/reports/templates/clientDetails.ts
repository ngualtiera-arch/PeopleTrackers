import type { Prisma } from '@peopletrackers/db';
import { escapeHtml, escapeMultiline, REPORT_BODY_FONT } from '../layout.js';

type ClientWithPackage = Prisma.ClientGetPayload<{ include: { package: true } }>;

function addressBlock(label: string, lines: (string | null)[]): string {
  const filled = lines.filter(Boolean);
  return `
    <div style="margin-bottom:10px;">
      <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">${label}</div>
      <div>${filled.length ? filled.map(escapeHtml).join('<br/>') : '—'}</div>
    </div>
  `;
}

function field(label: string, value: string | number | null): string {
  return `
    <div style="margin-bottom:8px;">
      <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">${label}</div>
      <div>${value !== null && value !== '' ? escapeHtml(String(value)) : '—'}</div>
    </div>
  `;
}

/** Client Details — spec §13.2 #6, §13.3 "full address block". */
export function clientDetailsTemplate(client: ClientWithPackage): string {
  const dateStr = new Date().toLocaleDateString('en-AU');

  return `
    <div style="${REPORT_BODY_FONT}">
      <h1 style="font-size:16px;margin:0 0 4px 0;">Client Details</h1>
      <div style="font-size:10px;color:#666;margin-bottom:16px;">${dateStr}</div>

      <h2 style="font-size:13px;margin:0 0 8px 0;">${escapeHtml(client.company) || escapeHtml(client.contactName) || `Client ${client.reference}`}</h2>

      <table style="width:100%;"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          ${field('ID Client', client.reference)}
          ${field('Company', client.company)}
          ${field('Kind', client.kind)}
          ${field('Name', client.contactName)}
          ${field('Email', client.email)}
        </td>
        <td style="width:50%;vertical-align:top;">
          ${field('Phone', client.phone)}
          ${field('Fax', client.fax)}
          ${field('Attention', client.attention)}
          ${field('Terms', client.terms)}
          ${field('ABN', client.abn)}
        </td>
      </tr></table>

      <table style="width:100%;margin-top:8px;"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          ${addressBlock('Physical Address', [client.addr1, client.addr2, [client.city, client.state, client.postcode].filter(Boolean).join(' '), client.country])}
        </td>
        <td style="width:50%;vertical-align:top;">
          ${addressBlock('Postal Address', [client.postalAddr1, client.postalAddr2, [client.postalCity, client.postalState, client.postalPostcode].filter(Boolean).join(' '), client.postalCountry])}
        </td>
      </tr></table>

      <table style="width:100%;margin-top:8px;"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          ${field('Email Invoice', client.emailInvoice)}
          ${field('Email Reports', client.emailReports)}
        </td>
        <td style="width:50%;vertical-align:top;">
          ${field('Package', client.package?.name ?? null)}
        </td>
      </tr></table>

      <div style="margin-top:8px;">
        <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">Notes</div>
        <div>${client.notes ? escapeMultiline(client.notes) : '—'}</div>
      </div>
    </div>
  `;
}
