import type { Client } from '@peopletrackers/db';
import { escapeHtml, type CompanySettings } from '../layout.js';

/**
 * Client Envelope — spec §13.2 #8. D14: "reproduce the existing envelope output as closely as
 * reasonable and verify during report testing" — no sample was supplied, so this is a standard
 * business-envelope layout (return address top-left, recipient centred), not a verified match.
 * DL size (220mm x 110mm landscape) per render.ts — also unverified, pending §14/D14 sign-off.
 */
export function clientEnvelopeTemplate(client: Client, company: CompanySettings): string {
  const recipientLines = [
    client.company,
    client.attention ? `Attn: ${client.attention}` : null,
    client.addr1,
    client.addr2,
    [client.city, client.state, client.postcode].filter(Boolean).join(' '),
    client.country && client.country !== 'Australia' ? client.country : null,
  ].filter(Boolean);

  return `
    <div style="font-family: Helvetica, Arial, sans-serif; font-size: 10px; width: 100%; height: 100%; position: relative; padding: 8mm;">
      <div style="position:absolute;top:8mm;left:8mm;font-size:8px;color:#333;">
        <div style="font-weight:bold;">${escapeHtml(company.tradingAs)}</div>
        <div>${escapeHtml(company.postalAddress)}</div>
      </div>
      <div style="position:absolute;top:45mm;left:60mm;font-size:12px;line-height:1.5;">
        ${recipientLines.map(escapeHtml).join('<br/>')}
      </div>
    </div>
  `;
}
