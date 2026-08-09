import { prisma } from '@peopletrackers/db';

export interface CompanySettings {
  legalName: string;
  tradingAs: string;
  abn: string;
  secondaryAbn: string;
  acn: string;
  email: string;
  website: string;
  additionalWebsite: string;
  postalAddress: string;
  contactNumber: string;
  confidentialityLine: string;
  officeByAppointmentLine: string;
  logoUrl: string | null;
}

export async function loadCompanySettings(): Promise<CompanySettings> {
  const row = await prisma.setting.findUnique({ where: { key: 'company' } });
  return row?.value as unknown as CompanySettings;
}

export function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Line breaks in free-text fields (notes, report body) are meaningful — preserve them. */
export function escapeMultiline(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

/**
 * Playwright's PDF headerTemplate/footerTemplate render in a separate, restricted context:
 * only inline styles are reliably honoured (no <link> stylesheets, and even some <style> block
 * rules are inconsistently applied), and the built-in classes `pageNumber`/`totalPages`/`date`
 * are the only way to inject those values. Kept deliberately simple for that reason.
 */
export function buildLetterheadHeader(settings: CompanySettings): string {
  const logo = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" style="height:40px;" />`
    // Placeholder pending the logo asset — spec §22. Swap for the <img> above once supplied.
    : `<div style="width:120px;height:40px;border:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#999;font-size:8px;">LOGO</div>`;

  const acnLine =
    settings.acn || settings.secondaryAbn
      ? `<div>${settings.acn ? `ACN: ${escapeHtml(settings.acn)}` : ''}${settings.acn && settings.secondaryAbn ? ' &nbsp; ' : ''}${settings.secondaryAbn ? `ABN: ${escapeHtml(settings.secondaryAbn)}` : ''}</div>`
      : '';

  return `
    <div style="width:100%;font-size:9px;font-family:Helvetica,Arial,sans-serif;color:#111;padding:0 24px;box-sizing:border-box;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:120px;vertical-align:top;">${logo}</td>
          <td style="vertical-align:top;">
            <div style="font-weight:bold;">${escapeHtml(settings.legalName)}</div>
            <div>t/as ${escapeHtml(settings.tradingAs)}</div>
            <div>ABN: ${escapeHtml(settings.abn)}</div>
            ${acnLine}
          </td>
          <td style="vertical-align:top;text-align:right;">
            <div>${escapeHtml(settings.additionalWebsite)}</div>
            <div>email: ${escapeHtml(settings.email)}</div>
            <div>${escapeHtml(settings.website)}</div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-weight:bold;letter-spacing:1px;margin-top:6px;">
        ${escapeHtml(settings.confidentialityLine)}
      </div>
      <hr style="border:none;border-top:1px solid #ccc;margin:6px 0 0 0;" />
    </div>
  `;
}

export function buildLetterheadFooter(settings: CompanySettings): string {
  return `
    <div style="width:100%;font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#555;padding:0 24px;box-sizing:border-box;text-align:center;">
      <hr style="border:none;border-top:1px solid #ccc;margin:0 0 4px 0;" />
      <div>${escapeHtml(settings.postalAddress)} &nbsp;|&nbsp; Contact Number: ${escapeHtml(settings.contactNumber)}</div>
      <div>${escapeHtml(settings.website)} &nbsp;|&nbsp; ${escapeHtml(settings.email)}</div>
      <div>${escapeHtml(settings.officeByAppointmentLine)}</div>
      <div style="margin-top:2px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
    </div>
  `;
}

export const REPORT_BODY_FONT = `font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #111;`;
