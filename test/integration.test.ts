import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { renderToImage } from '../src/engine/render.js';
import { BrowserManager } from '../src/engine/browser.js';
import type { RenderConfig } from '../src/engine/types.js';

let manager: BrowserManager;

beforeAll(() => {
  manager = new BrowserManager({ concurrency: 2 });
});
afterAll(async () => {
  await manager.close();
});

function cfg(overrides: Partial<RenderConfig>): RenderConfig {
  return {
    code: '<h1>Hi</h1>',
    inputType: 'html',
    format: 'png',
    width: 400,
    height: 300,
    scale: 1,
    fullPage: false,
    transparent: false,
    backgroundColor: '#ffffff',
    quality: 90,
    ...overrides,
  };
}

function isPng(buf: Buffer) {
  return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}
function isJpeg(buf: Buffer) {
  return buf[0] === 0xff && buf[1] === 0xd8;
}
function isWebp(buf: Buffer) {
  return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
}

describe('rendering pipeline (integration)', () => {
  it('renders basic HTML to PNG', async () => {
    const r = await renderToImage(cfg({ code: '<h1 style="color:#5b8cff">Hello</h1>' }), {
      browser: manager,
    });
    expect(isPng(r.buffer)).toBe(true);
    expect(r.mimeType).toBe('image/png');
    expect(r.metadata.width).toBe(400);
    expect(r.metadata.height).toBe(300);
  });

  it('renders CSS', async () => {
    const r = await renderToImage(
      cfg({ inputType: 'css', code: '.rasterly-showcase h1{color:crimson}' }),
      { browser: manager },
    );
    expect(r.metadata.bytes).toBeGreaterThan(100);
  });

  it('compiles and renders JSX', async () => {
    const r = await renderToImage(
      cfg({
        inputType: 'jsx',
        code: 'function App(){return <div style={{padding:24,fontFamily:"sans-serif"}}><h2>JSX</h2></div>}',
      }),
      { browser: manager },
    );
    expect(isPng(r.buffer)).toBe(true);
  });

  it('compiles and renders TSX', async () => {
    const r = await renderToImage(
      cfg({
        inputType: 'tsx',
        code: 'type P={n:number}; function App(p:P){return <div>{p.n}</div>}',
      }),
      { browser: manager },
    );
    expect(r.metadata.bytes).toBeGreaterThan(100);
  });

  it('renders a Next.js component with next/* imports and next/font', async () => {
    const r = await renderToImage(
      cfg({
        inputType: 'next',
        code: `'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
export default function Page() {
  const inter = Inter({ subsets: ['latin'] });
  return (
    <div className={inter.className} style={{ padding: 24 }}>
      <h1>Next</h1>
      <Image src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width={20} height={20} alt="" />
      <Link href="/about">About</Link>
    </div>
  );
}`,
      }),
      { browser: manager },
    );
    expect(isPng(r.buffer)).toBe(true);
    expect(r.metadata.bytes).toBeGreaterThan(100);
  });

  it('exports JPEG', async () => {
    const r = await renderToImage(cfg({ format: 'jpeg', quality: 80 }), { browser: manager });
    expect(isJpeg(r.buffer)).toBe(true);
    expect(r.extension).toBe('jpg');
  });

  it('exports WebP', async () => {
    const r = await renderToImage(cfg({ format: 'webp' }), { browser: manager });
    expect(isWebp(r.buffer)).toBe(true);
  });

  it('honors custom dimensions', async () => {
    const r = await renderToImage(cfg({ width: 640, height: 480 }), { browser: manager });
    expect(r.metadata.width).toBe(640);
    expect(r.metadata.height).toBe(480);
  });

  it('applies scale factor to output size', async () => {
    const r = await renderToImage(cfg({ width: 300, height: 200, scale: 2 }), { browser: manager });
    expect(r.metadata.width).toBe(600);
    expect(r.metadata.height).toBe(400);
  });

  it('captures full page beyond the viewport height', async () => {
    const tall =
      '<div style="height:1200px;background:linear-gradient(#5b8cff,#0f0f12)"></div>';
    const r = await renderToImage(cfg({ width: 400, height: 300, fullPage: true, code: tall }), {
      browser: manager,
    });
    const meta = await sharp(r.buffer).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height ?? 0).toBeGreaterThanOrEqual(1000);
  });

  it('produces a transparent PNG with alpha', async () => {
    const r = await renderToImage(
      cfg({ transparent: true, code: '<div style="width:100px;height:100px"></div>' }),
      { browser: manager },
    );
    const meta = await sharp(r.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it('reports compilation errors', async () => {
    await expect(
      renderToImage(cfg({ inputType: 'jsx', code: 'const = ;' }), { browser: manager }),
    ).rejects.toMatchObject({ code: 'COMPILATION_ERROR' });
  });

  it('blocks SSRF targets', async () => {
    await expect(
      renderToImage(cfg({ inputType: 'url', code: 'http://127.0.0.1:8080/' }), {
        browser: manager,
      }),
    ).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('cleans up browser contexts after each job', async () => {
    await renderToImage(cfg({}), { browser: manager });
    expect(manager.activeContextCount).toBe(0);
  });
});