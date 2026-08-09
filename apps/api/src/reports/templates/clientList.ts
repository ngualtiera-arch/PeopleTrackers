import type { Client } from '@peopletrackers/db';
import { escapeHtml, REPORT_BODY_FONT } from '../layout.js';

/** Client List — spec §13.2 #7, §13.3: "Name · Company · Phone · Email · Fax, titled 'Clients' plus the current date." */
export function clientListTemplate(clients: Client[]): string {
  const dateStr = new Date().toLocaleDateString('en-AU');

  const rows = clients
    .map(
      (c) => `
    <tr>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.contactName)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.company)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.phone)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.email)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.fax)}</td>
    </tr>`,
    )
    .join('');

  return `
    <div style="${REPORT_BODY_FONT}">
      <h1 style="font-size:16px;margin:0 0 4px 0;">Clients</h1>
      <div style="font-size:10px;color:#666;margin-bottom:12px;">${dateStr}</div>
      <table style="width:100%;">
        <thead>
          <tr style="text-align:left;font-size:9px;text-transform:uppercase;color:#666;">
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Name</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Company</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Phone</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Email</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Fax</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
