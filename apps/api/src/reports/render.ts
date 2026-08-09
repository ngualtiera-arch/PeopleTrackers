import { getBrowser } from './browser.js';

export interface RenderOptions {
  headerHtml?: string;
  footerHtml?: string;
  /** DL envelope (220mm x 110mm) — a best-effort default per D14, pending verification against
   *  the existing envelope output during report testing. Not otherwise validated against a sample. */
  format?: 'a4' | 'envelope-dl';
}

function wrapDocument(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; }
      table { border-collapse: collapse; width: 100%; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

export async function renderPdf(bodyHtml: string, options: RenderOptions = {}): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(wrapDocument(bodyHtml), { waitUntil: 'networkidle' });

    const isEnvelope = options.format === 'envelope-dl';
    const displayHeaderFooter = Boolean(options.headerHtml || options.footerHtml);

    const pdf = await page.pdf({
      // Explicit width/height already encode the DL envelope's wide-short shape directly —
      // `landscape: true` on top of that makes Playwright swap them again, producing a
      // tall/portrait page instead. Leave landscape unset (false) whenever width/height are given.
      width: isEnvelope ? '220mm' : undefined,
      height: isEnvelope ? '110mm' : undefined,
      format: isEnvelope ? undefined : 'A4',
      printBackground: true,
      displayHeaderFooter,
      headerTemplate: options.headerHtml ?? '<span></span>',
      footerTemplate: options.footerHtml ?? '<span></span>',
      margin: isEnvelope
        ? { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        : { top: '38mm', bottom: '22mm', left: '15mm', right: '15mm' },
    });

    return pdf;
  } finally {
    await page.close();
  }
}
