import type { InputType, OutputFormat, RenderSettings } from '../types';

interface Props {
  settings: RenderSettings;
  onChange: (patch: Partial<RenderSettings>) => void;
  onRender: () => void;
  onExport: () => void;
  rendering: boolean;
  dirty: boolean;
}

const INPUT_TABS: { id: InputType; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'jsx', label: 'JSX' },
  { id: 'tsx', label: 'TSX' },
  { id: 'url', label: 'URL' },
];

const FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp'];

function Segmented<T extends string | number>({
  options,
  value,
  onSelect,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-md border border-ink-700 bg-ink-900 p-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onSelect(o.id)}
          className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${
            value === o.id
              ? 'rounded bg-ink-700 text-ink-100'
              : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-2 text-[12px] ${
        disabled ? 'cursor-not-allowed opacity-40' : 'text-ink-300'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-ink-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label}
    </label>
  );
}

export default function SettingsBar({ settings, onChange, onRender, onExport, rendering, dirty }: Props) {
  const lossy = settings.format !== 'png';
  const canTransparent = settings.format !== 'jpeg';

  return (
    <div className="flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3 border-b border-ink-800 bg-ink-900/40 px-4 py-3">
      <div>
        <span className="label">Input</span>
        <Segmented
          label="Input type"
          options={INPUT_TABS}
          value={settings.inputType}
          onSelect={(v) => onChange({ inputType: v })}
        />
      </div>

      <div>
        <span className="label">Format</span>
        <Segmented
          label="Output format"
          options={FORMATS.map((f) => ({ id: f, label: f.toUpperCase() }))}
          value={settings.format}
          onSelect={(v) =>
            onChange({ format: v, transparent: v === 'jpeg' ? false : settings.transparent })
          }
        />
      </div>

      <div>
        <span className="label">Size</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={16}
            max={8192}
            className="field w-[74px]"
            value={settings.width}
            onChange={(e) => onChange({ width: clampInt(e.target.value, 16, 8192, settings.width) })}
            aria-label="Width"
          />
          <span className="text-ink-500">×</span>
          <input
            type="number"
            min={16}
            max={8192}
            className="field w-[74px]"
            value={settings.height}
            onChange={(e) => onChange({ height: clampInt(e.target.value, 16, 8192, settings.height) })}
            aria-label="Height"
          />
        </div>
      </div>

      <div>
        <span className="label">Scale</span>
        <Segmented
          label="Scale factor"
          options={[
            { id: 1, label: '1×' },
            { id: 2, label: '2×' },
            { id: 3, label: '3×' },
          ]}
          value={settings.scale}
          onSelect={(v) => onChange({ scale: v })}
        />
      </div>

      <div>
        <span className="label">Background</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-8 cursor-pointer rounded border border-ink-700 bg-ink-900"
            value={settings.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            aria-label="Background color"
          />
          <input
            className="field w-[92px] font-mono text-[12px]"
            value={settings.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            aria-label="Background hex"
          />
          <Toggle
            label="Transparent"
            checked={settings.transparent}
            disabled={!canTransparent}
            onChange={(v) => onChange({ transparent: v })}
          />
        </div>
      </div>

      {lossy && (
        <div>
          <span className="label">Quality · {settings.quality}</span>
          <input
            type="range"
            min={1}
            max={100}
            value={settings.quality}
            onChange={(e) => onChange({ quality: Number(e.target.value) })}
            className="h-8 w-28 accent-accent"
            aria-label="Quality"
          />
        </div>
      )}

      <div>
        <span className="label">Capture</span>
        <Toggle
          label="Full page"
          checked={settings.fullPage}
          onChange={(v) => onChange({ fullPage: v })}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {dirty && <span className="text-[11px] text-ink-400">Unrendered changes</span>}
        <button type="button" className="btn-ghost" onClick={onRender} disabled={rendering}>
          {rendering ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-400 border-t-transparent" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 3v18l15-9L5 3Z" fill="currentColor" />
            </svg>
          )}
          Render
        </button>
        <button type="button" className="btn-primary" onClick={onExport} disabled={rendering}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}