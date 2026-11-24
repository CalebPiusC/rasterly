import { useCallback, useMemo, useState } from 'react';
import Header from './components/Header';
import SettingsBar from './components/SettingsBar';
import CodeEditor from './components/CodeEditor';
import PreviewPanel from './components/PreviewPanel';
import { STARTER_EXAMPLES } from './lib/examples';
import { renderImage, downloadBlob, makeFilename } from './lib/api';
import type { InputType, RenderResponse, RenderSettings } from './types';

const DEFAULT_SETTINGS: RenderSettings = {
  inputType: 'html',
  format: 'png',
  width: 1200,
  height: 800,
  scale: 1,
  fullPage: false,
  transparent: false,
  backgroundColor: '#0f0f12',
  quality: 90,
};

export default function App() {
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const [codes, setCodes] = useState<Record<InputType, string>>(STARTER_EXAMPLES);
  const [result, setResult] = useState<RenderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const code = codes[settings.inputType];

  const currentKey = useMemo(
    () => JSON.stringify({ settings, code }),
    [settings, code],
  );
  const dirty = result != null && currentKey !== lastKey;

  const patchSettings = useCallback((patch: Partial<RenderSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const setCode = useCallback(
    (value: string) => {
      setCodes((prev) => ({ ...prev, [settings.inputType]: value }));
    },
    [settings.inputType],
  );

  const runRender = useCallback(async (): Promise<RenderResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await renderImage({ ...settings, code });
      setResult(res);
      setLastKey(JSON.stringify({ settings, code }));
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [settings, code]);

  const handleRender = useCallback(() => {
    void runRender();
  }, [runRender]);

  const handleExport = useCallback(async () => {
    const res = await runRender();
    if (res) {
      downloadBlob(res.blob, makeFilename(res.metadata.format));
    }
  }, [runRender]);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <SettingsBar
        settings={settings}
        onChange={patchSettings}
        onRender={handleRender}
        onExport={handleExport}
        rendering={loading}
        dirty={dirty}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-ink-800 lg:border-b-0 lg:border-r">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-ink-800 px-3">
            <span className="text-[12px] font-medium text-ink-300">
              {settings.inputType === 'url' ? 'Source URL' : 'Source code'}
            </span>
            <span className="font-mono text-[11px] text-ink-500">
              {settings.inputType.toUpperCase()}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            {settings.inputType === 'url' ? (
              <div className="p-4">
                <label className="label" htmlFor="url-input">
                  Page URL
                </label>
                <input
                  id="url-input"
                  type="url"
                  className="field font-mono"
                  placeholder="https://example.com"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                />
                <p className="mt-3 max-w-md text-[12px] leading-relaxed text-ink-500">
                  URL capture runs in an isolated browser with SSRF protection. Private and
                  internal network addresses are blocked.
                </p>
              </div>
            ) : (
              <CodeEditor
                value={code}
                inputType={settings.inputType}
                onChange={setCode}
                onRender={handleRender}
              />
            )}
          </div>
        </section>
        <section className="flex min-h-0 flex-col">
          <PreviewPanel
            result={result}
            loading={loading}
            error={error}
            onRender={handleRender}
          />
        </section>
      </main>
    </div>
  );
}