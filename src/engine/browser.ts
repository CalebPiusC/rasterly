import { chromium, type Browser, type BrowserContext } from 'playwright';
import { RenderError } from './errors.js';

export interface BrowserManagerOptions {
  executablePath?: string;
  /** Max concurrent browser contexts. */
  concurrency?: number;
}

/**
 * Owns a single Chromium process and hands out isolated browser contexts.
 * Each render job gets its own context; contexts are always closed.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private activeContexts = 0;
  private readonly maxContexts: number;
  private readonly executablePath?: string;

  constructor(options: BrowserManagerOptions = {}) {
    this.maxContexts = Math.max(1, options.concurrency ?? 4);
    this.executablePath = options.executablePath || process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (this.launching) return this.launching;

    this.launching = (async () => {
      const args = ['--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'];
      if (process.env.CHROMIUM_NO_SANDBOX === 'true') args.push('--no-sandbox');
      try {
        this.browser = await chromium.launch({
          executablePath: this.executablePath,
          args,
          headless: true,
        });
        return this.browser;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new RenderError('BROWSER_ERROR', 'Failed to launch Chromium', message, error);
      } finally {
        this.launching = null;
      }
    })();

    return this.launching;
  }

  async createContext(): Promise<BrowserContext> {
    if (this.activeContexts >= this.maxContexts) {
      throw new RenderError('BROWSER_ERROR', 'Render concurrency limit reached, try again shortly');
    }
    const browser = await this.getBrowser();
    this.activeContexts += 1;
    try {
      return await browser.newContext({ deviceScaleFactor: 1 });
    } catch (error) {
      this.activeContexts -= 1;
      throw error;
    }
  }

  releaseContext(): void {
    this.activeContexts = Math.max(0, this.activeContexts - 1);
  }

  /** Number of currently active contexts (for tests/observability). */
  get activeContextCount(): number {
    return this.activeContexts;
  }

  get isReady(): boolean {
    return this.browser != null;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }
}

let sharedManager: BrowserManager | null = null;

export function getBrowserManager(options?: BrowserManagerOptions): BrowserManager {
  if (!sharedManager) sharedManager = new BrowserManager(options);
  return sharedManager;
}

export async function closeSharedBrowser(): Promise<void> {
  if (sharedManager) {
    await sharedManager.close();
    sharedManager = null;
  }
}