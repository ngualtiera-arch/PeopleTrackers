import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

/** One Chromium instance shared across requests — launching per-request would be far too slow. */
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
