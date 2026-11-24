import { build, type Plugin } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { RenderError } from './errors.js';

export interface CompileResult {
  /** IIFE bundle assigning the component to a global. */
  code: string;
  /** CSS emitted by the bundle (imports / CSS modules), if any. */
  css: string;
  /** Global variable name the bundle populates. */
  globalName: string;
}

export interface CompileOptions {
  loader: 'jsx' | 'tsx';
  /** Resolve Next.js APIs (next/*, next/font, use client). */
  next?: boolean;
  /** Extra path aliases, e.g. { '@/*': '<abs>/*' }. */
  aliases?: Record<string, string>;
  /** Base directory for resolving relative imports (defaults to cwd). */
  resolveDir?: string;
}

const GLOBAL_NAME = '__RasterlyComponent';
const SHIM_NS = 'rasterly-next-shim';
const FONT_RT_NS = 'rasterly-next-font-runtime';

/* ------------------------------------------------------------------ *
 * Next.js module shims (browser-safe, rendered in the page)
 * ------------------------------------------------------------------ */

const NEXT_SHIMS: Record<string, string> = {
  'next/image': `
    import React from 'react';
    export default function Image(props) {
      const { src, alt = '', width, height, fill, style, priority, ...rest } = props || {};
      const base = { ...(style || {}) };
      if (fill) Object.assign(base, { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' });
      else { if (width) base.width = width; if (height) base.height = height; }
      return React.createElement('img', { src: typeof src === 'string' ? src : (src && src.src), alt, style: base, ...rest });
    }
  `,
  'next/link': `
    import React from 'react';
    export default function Link(props) {
      const { href, children, replace, scroll, shallow, prefetch, ...rest } = props || {};
      return React.createElement('a', { href: typeof href === 'string' ? href : (href && href.pathname) || '#', ...rest }, children);
    }
  `,
  'next/head': `
    import React from 'react';
    export default function Head(props) {
      React.useEffect(function () {
        try {
          const nodes = window.__rasterlyHeadNodes || (window.__rasterlyHeadNodes = []);
          nodes.push(props && props.children);
        } catch (e) {}
      });
      return null;
    }
  `,
  'next/script': `
    import React from 'react';
    export default function Script(props) {
      const { src, children, strategy, dangerouslySetInnerHTML, ...rest } = props || {};
      return React.createElement('script', { src, dangerouslySetInnerHTML, ...rest }, children);
    }
  `,
  'next/router': `
    import React from 'react';
    const router = {
      pathname: '/', query: {}, asPath: '/',
      push: async function () { return true; },
      replace: async function () { return true; },
      prefetch: async function () { return undefined; },
      back: function () {}, forward: function () {}, reload: function () {},
      events: { on: function () {}, off: function () {}, emit: function () {} },
    };
    export function useRouter() { return router; }
    export function withRouter(Component) {
      return function WithRouter(props) { return React.createElement(Component, { ...props, router }); };
    }
    export default router;
  `,
  'next/navigation': `
    const router = {
      push: function () {}, replace: function () {}, refresh: function () {},
      back: function () {}, forward: function () {}, prefetch: function () {},
    };
    export function useRouter() { return router; }
    export function usePathname() { return '/'; }
    export function useSearchParams() { return new URLSearchParams(); }
    export function useParams() { return {}; }
    export function useSelectedLayoutSegment() { return null; }
    export function redirect() {}
    export function permanentRedirect() {}
    export function notFound() {}
  `,
  'next/dynamic': `
    import React from 'react';
    export default function dynamic(loader, options) {
      return function DynamicComponent(props) {
        const [Component, setComponent] = React.useState(null);
        React.useEffect(function () {
          let active = true;
          Promise.resolve(typeof loader === 'function' ? loader() : loader).then(function (mod) {
            if (!active) return;
            const C = mod && (mod.default || mod);
            setComponent(function () { return C; });
          }).catch(function () {});
          return function () { active = false; };
        }, []);
        if (!Component) return options && options.loading ? React.createElement(options.loading) : null;
        return React.createElement(Component, props);
      };
    }
  `,
  'next/document': `
    export default function Document() { return null; }
    export function Html(props) { return null; }
    export function Head() { return null; }
    export function Main() { return null; }
    export function NextScript() { return null; }
  `,
  'next/config': `
    export default function getConfig() { return { publicRuntimeConfig: {}, serverRuntimeConfig: {} }; }
    export function setConfig() {}
  `,
};

const FONT_RUNTIME = `
  function makeOne(kind, family) {
    return function (options) {
      options = options || {};
      var className = '__rasterly_font_' + String(family).replace(/[^a-z0-9]/gi, '');
      var style = { fontFamily: String(family) };
      if (kind === 'google') {
        var w = options.weight ? (Array.isArray(options.weight) ? options.weight : [options.weight]) : [];
        var fam = w.length ? String(family) + ':wght@' + w.join(';') : String(family);
        try { if (globalThis.__rasterlyLoadFont) globalThis.__rasterlyLoadFont(fam); } catch (e) {}
      }
      return { className: className, style: style, variable: className };
    };
  }
  function makeLoader(kind) {
    var fn = function () { return { className: '', style: {}, variable: '' }; };
    return new Proxy(fn, {
      get: function (_t, prop) {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string') return undefined;
        return makeOne(kind, prop);
      },
    });
  }
  export function createFontLoader(kind) { return makeLoader(kind); }
`;

const GENERIC_SHIM = `
  const React = require('react');
  const passthrough = function () { return null; };
  module.exports = new Proxy(passthrough, {
    get: function () { return passthrough; },
    apply: function () { return null; },
  });
`;

/* ------------------------------------------------------------------ *
 * Source transforms
 * ------------------------------------------------------------------ */

/** Rewrite `next/font/*` imports into a runtime helper call (supports any font name). */
export function transformNextFontImports(source: string): string {
  let out = source;
  // Named: import { Inter, Roboto } from 'next/font/google'
  out = out.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]next\/font\/(google|local)['"];?/g,
    (_m, names: string, kind: string) => `const {${names}} = __rasterlyFont('${kind}');`,
  );
  // Default: import localFont from 'next/font/local'
  out = out.replace(
    /import\s+([A-Za-z_$][\w$]*)\s+from\s*['"]next\/font\/(google|local)['"];?/g,
    (_m, name: string, kind: string) => `const ${name} = __rasterlyFont('${kind}');`,
  );
  return out;
}

function ensureDefaultExport(source: string): string {
  if (/export\s+default\b/.test(source)) return source;
  const fnMatch = source.match(/(?:function|const|let|var)\s+([A-Z][A-Za-z0-9_]*)/);
  if (fnMatch) return `${source}\nexport default ${fnMatch[1]};\n`;
  return `const __Component = (${source});\nexport default __Component;\n`;
}

/* ------------------------------------------------------------------ *
 * tsconfig path-alias loading
 * ------------------------------------------------------------------ */

function stripJsonComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

async function loadTsconfigAliases(
  tsconfigPath: string | undefined,
  resolveDir: string,
): Promise<Record<string, string>> {
  const path = tsconfigPath ? resolve(tsconfigPath) : resolve(resolveDir, 'tsconfig.json');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return {};
  }
  try {
    const json = JSON.parse(stripJsonComments(raw));
    const baseUrl = json.compilerOptions?.baseUrl
      ? resolve(dirname(path), json.compilerOptions.baseUrl)
      : dirname(path);
    const paths = json.compilerOptions?.paths as Record<string, string[]> | undefined;
    const aliases: Record<string, string> = {};
    if (paths) {
      for (const [key, targets] of Object.entries(paths)) {
        if (targets[0]) aliases[key] = resolve(baseUrl, targets[0]);
      }
    }
    return aliases;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ *
 * Compilation
 * ------------------------------------------------------------------ */

export async function compileJsx(
  source: string,
  options: CompileOptions,
): Promise<CompileResult> {
  const { loader } = options;
  const next = options.next ?? false;
  const resolveDir = options.resolveDir ?? process.cwd();

  let contents = next ? transformNextFontImports(source) : source;
  contents = ensureDefaultExport(contents);

  const aliasMap: Record<string, string> = { ...(options.aliases ?? {}) };
  if (next) {
    Object.assign(aliasMap, await loadTsconfigAliases(undefined, resolveDir));
  }

  const plugins: Plugin[] = [];

  if (next) {
    plugins.push({
      name: 'rasterly-next',
      setup(builder) {
        builder.onResolve({ filter: /^next\// }, (args) => {
          return { path: args.path, namespace: SHIM_NS };
        });
        builder.onLoad({ filter: /.*/, namespace: SHIM_NS }, (args) => {
          const source = NEXT_SHIMS[args.path] ?? GENERIC_SHIM;
          return { contents: source, loader: 'js', resolveDir };
        });
        builder.onResolve({ filter: /^rasterly-next-font-runtime$/ }, () => {
          return { path: FONT_RT_NS, namespace: FONT_RT_NS };
        });
        builder.onLoad({ filter: /.*/, namespace: FONT_RT_NS }, () => {
          return { contents: FONT_RUNTIME, loader: 'js', resolveDir };
        });
      },
    });
  }

  // Path aliases (longest prefix first).
  const aliasEntries = Object.entries(aliasMap).sort((a, b) => b[0].length - a[0].length);
  if (aliasEntries.length > 0) {
    plugins.push({
      name: 'rasterly-alias',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          for (const [key, target] of aliasEntries) {
            if (key.endsWith('/*')) {
              const prefix = key.slice(0, -1); // keep trailing slash
              if (args.path.startsWith(prefix)) {
                const rest = args.path.slice(prefix.length);
                return { path: resolve(target, rest), namespace: 'file' };
              }
            } else if (args.path === key) {
              return { path: target, namespace: 'file' };
            }
          }
          return undefined;
        });
      },
    });
  }

  try {
    const result = await build({
      stdin: {
        contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
window.React = React;
window.__RasterlyReactDOM = { createRoot: createRoot };
${next ? `import { createFontLoader } from '${FONT_RT_NS}';\nwindow.__rasterlyFont = createFontLoader;\n` : ''}${contents}
`,
        loader,
        resolveDir,
        sourcefile: `input.${loader}`,
      },
      bundle: true,
      write: false,
      outdir: 'rasterly-out',
      nodePaths: [resolve(process.cwd(), 'node_modules')],
      format: 'iife',
      globalName: GLOBAL_NAME,
      platform: 'browser',
      target: ['chrome110'],
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      define: { 'process.env.NODE_ENV': '"production"' },
      minify: false,
      legalComments: 'none',
      logLevel: 'silent',
      plugins,
    });

    const files = result.outputFiles ?? [];
    const jsFile = files.find((f) => f.path.endsWith('.js'));
    const cssFile = files.find((f) => f.path.endsWith('.css'));
    if (!jsFile) {
      throw new RenderError('COMPILATION_ERROR', 'esbuild produced no JavaScript output');
    }

    // Expose helpers the document needs (set inside the bundle IIFE).
    return { code: jsFile.text, css: cssFile?.text ?? '', globalName: GLOBAL_NAME };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RenderError('COMPILATION_ERROR', 'Failed to compile source', message, error);
  }
}