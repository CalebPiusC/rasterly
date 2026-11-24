import { build } from 'esbuild';
import { RenderError } from './errors.js';

export interface CompileResult {
  /** IIFE bundle assigning the component to a global. */
  code: string;
  /** Global variable name the bundle populates. */
  globalName: string;
}

const GLOBAL_NAME = '__RasterlyComponent';

function ensureDefaultExport(source: string): string {
  if (/export\s+default\b/.test(source)) return source;

  // Find a PascalCase component declaration to use as the default export.
  const fnMatch = source.match(/(?:function|const|let|var)\s+([A-Z][A-Za-z0-9_]*)/);
  if (fnMatch) {
    return `${source}\nexport default ${fnMatch[1]};\n`;
  }
  // Last resort: assume the whole source is an expression component.
  return `const __Component = (${source});\nexport default __Component;\n`;
}

/**
 * Compile JSX/TSX source into a browser-executable IIFE bundle that exposes the
 * default-exported component on a global. React and ReactDOM are bundled in.
 */
export async function compileJsx(source: string, loader: 'jsx' | 'tsx'): Promise<CompileResult> {
  const contents = ensureDefaultExport(source);

  try {
    const result = await build({
      stdin: {
        contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
window.React = React;
window.__RasterlyReactDOM = { createRoot: createRoot };
${contents}
`,
        loader,
        resolveDir: process.cwd(),
        sourcefile: `input.${loader}`,
      },
      bundle: true,
      write: false,
      format: 'iife',
      globalName: GLOBAL_NAME,
      platform: 'browser',
      target: ['chrome110'],
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      minify: false,
      legalComments: 'none',
    });

    const code = result.outputFiles?.[0]?.text;
    if (!code) {
      throw new RenderError('COMPILATION_ERROR', 'esbuild produced no output');
    }
    return { code, globalName: GLOBAL_NAME };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RenderError('COMPILATION_ERROR', 'Failed to compile JSX/TSX', message, error);
  }
}