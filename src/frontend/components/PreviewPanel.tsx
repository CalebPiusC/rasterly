import { useState, useMemo, useEffect } from 'react';
import type { RenderResponse } from '../types';

interface Props {
  result: RenderResponse | null;
  loading: boolean;
  error: string | null;
  onRender: () => void;
}

const ZOOMS: { id: number | 'fit'; label: string }[] = [
  { id: 'fit', label: 'Fit' },
  { id: 0.5, label: '50%' },
  { id: 1, label: '100%' },
  { id: 2, label: '200%' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PreviewPanel({ result, loading, error, onRender }: Props) {
  const [zoom, setZoom] = useState<number | 'fit'>('fit');

  // Keep an object URL in sync with the result blob, revoking the previous one.
  const objectUrl = useMemo(
    () => (result ? URL.createObjectURL(result.blob) : null),
    [result],
  );
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const meta = result?.metadata;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ink-800 px-3">
        <div className="flex items-center gap-2 text-[12px] text-ink-400">
          <span className="font-medium text-ink-300">Preview</span>
          {meta && (
            <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">
              {meta.width}×{meta.height} · {meta.format.toUpperCase()} · {formatBytes(meta.bytes)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-ink-700 bg-ink-900 p-0.5">
          {ZOOMS.map((z) => (
            <button
              key={String(z.id)}
              type="button"
              onClick={() => setZoom(z.id)}
              className={`px-2 py-0.5 text-[12px] transition-colors ${
                zoom === z.id ? 'rounded bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="checkerboard relative min-h-0 flex-1 overflow-auto p-6">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink-950/40 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-900 px-4 py-2.5 text-sm text-ink-200 shadow-panel">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Rendering…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto mt-10 max-w-md rounded-lg border border-red-500/30 bg-red-500/5 p-4 animate-fade-in">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 8v5m0 3.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Render failed
            </div>
            <p className="text-[13px] leading-relaxed text-red-200/80">{error}</p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="grid h-full place-items-center">
            <div className="text-center text-ink-500">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg border border-ink-700 bg-ink-850">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="9" cy="10" r="1.6" fill="currentColor" />
                  <path d="m4 18 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm">Nothing rendered yet</p>
              <p className="mt-1 text-[12px]">Press Render or ⌘/Ctrl + Enter</p>
            </div>
          </div>
        )}

        {result && objectUrl && !error && (
          <div className="grid min-h-full place-items-center">
            <img
              src={objectUrl}
              alt="Rendered output"
              style={
                zoom === 'fit'
                  ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
                  : { width: (meta?.width ?? 0) * zoom, height: 'auto' }
              }
              className="rounded shadow-panel ring-1 ring-black/40"
            />
          </div>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center justify-between border-t border-ink-800 px-3 text-[11px] text-ink-500">
        <span>
          {meta
            ? `${meta.durationMs} ms · scale ${meta.scale}×${meta.transparent ? ' · transparent' : ''}`
            : 'Ready'}
        </span>
        <button type="button" className="btn-subtle h-6 px-2 text-[11px]" onClick={onRender}>
          Rerender
        </button>
      </div>
    </div>
  );
}