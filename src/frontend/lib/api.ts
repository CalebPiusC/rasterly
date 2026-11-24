import type { RenderResponse, RenderSettings } from '../types';

export interface RenderRequest extends RenderSettings {
  code: string;
}

export async function renderImage(req: RenderRequest): Promise<RenderResponse> {
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let message = `Render failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message || message;
      if (data.issues?.length) {
        message += ': ' + data.issues.map((i: any) => i.message).join(', ');
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const metaHeader = res.headers.get('X-Rasterly-Metadata');
  const metadata = metaHeader
    ? (JSON.parse(metaHeader) as RenderResponse['metadata'])
    : {
        width: 0,
        height: 0,
        format: req.format,
        scale: req.scale,
        bytes: blob.size,
        durationMs: 0,
        fullPage: req.fullPage,
        transparent: req.transparent,
      };
  return { blob, metadata };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function makeFilename(format: string): string {
  const ext = format === 'jpeg' ? 'jpg' : format;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `rasterly-${stamp}.${ext}`;
}