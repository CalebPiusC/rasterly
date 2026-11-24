import type { BrowserContext, Page } from 'playwright';
import { RenderError } from './errors.js';
import { isPrivateAddress } from './ssrf.js';
import { isIP } from 'node:net';

export interface CaptureOptions {
  width: number;
  height: number;
  scale: number;
  fullPage: boolean;
  timeoutMs: number;
  /** Capture with a transparent background (PNG/WebP). */
  transparent?: boolean;
  /** When set, navigate to this URL instead of using setContent. */
  url?: string;
  /** HTML to render via setContent when no url is given. */
  html?: string;
}

const MAX_SUBRESOURCE_HOSTS = 256;

function isBlockedLiteralHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIP(host)) return isPrivateAddress(host);
  return false;
}

/**
 * Wait for fonts, images and a stable frame without relying on fixed delays.
 */
async function waitForRenderable(page: Page, timeoutMs: number): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }
    const images = Array.from(document.images);
    await Promise.race([
      Promise.all(
        images.map((img) =>
          img.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
        ),
      ),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    // Two animation frames to guarantee layout/paint has settled.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }).catch(() => undefined);

  // Wait for network to go idle, bounded by the job timeout.
  await page
    .waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 10_000) })
    .catch(() => undefined);
}

export async function captureScreenshot(
  context: BrowserContext,
  options: CaptureOptions,
): Promise<Buffer> {
  const page = await context.newPage();
  const seenHosts = new Set<string>();

  // Network guard: block private/internal targets and cap unique hosts.
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) {
      return route.continue();
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return route.abort();
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return route.abort();
    }
    if (isBlockedLiteralHost(parsed.hostname)) {
      return route.abort();
    }
    if (seenHosts.size >= MAX_SUBRESOURCE_HOSTS && !seenHosts.has(parsed.hostname)) {
      return route.abort();
    }
    seenHosts.add(parsed.hostname);
    return route.continue();
  });

  try {
    if (options.url) {
      await page.goto(options.url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs,
      });
    } else if (options.html != null) {
      await page.setContent(options.html, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs,
      });
    }

    await waitForRenderable(page, options.timeoutMs);

    const buffer = await page.screenshot({
      fullPage: options.fullPage,
      omitBackground: options.transparent ?? false,
      clip: options.fullPage
        ? undefined
        : { x: 0, y: 0, width: options.width, height: options.height },
      type: 'png',
    });

    return buffer;
  } catch (error) {
    if (error instanceof RenderError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout/i.test(message)) {
      throw new RenderError('RENDER_TIMEOUT', 'Rendering timed out', message, error);
    }
    throw new RenderError('NAVIGATION_ERROR', 'Failed to capture page', message, error);
  } finally {
    await page.close().catch(() => undefined);
  }
}