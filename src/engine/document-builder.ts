import type { NormalizedRenderConfig } from './types.js';
import type { CompileResult } from './jsx-compiler.js';

const CSS_SHOWCASE = `
<div class="rasterly-showcase">
  <h1>Rasterly CSS Preview</h1>
  <p>This is a paragraph rendered with your stylesheet. Edit the CSS to style the elements below.</p>
  <a href="#">A link</a>
  <button>A button</button>
  <ul><li>List item one</li><li>List item two</li></ul>
  <blockquote>A blockquote for quotes.</blockquote>
  <code>inline code</code>
</div>`;

function escapeCloseScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script');
}

function baseStyle(config: NormalizedRenderConfig): string {
  const bg = config.transparent ? 'transparent' : config.backgroundColor;
  return `
    html, body {
      margin: 0;
      padding: 0;
      background: ${bg};
    }
    body {
      width: ${config.width}px;
      min-height: ${config.height}px;
    }
    #rasterly-root {
      width: ${config.width}px;
      min-height: ${config.height}px;
    }
  `;
}

export interface BuiltDocument {
  html: string;
}

/**
 * Build a complete, self-contained HTML document for the given config.
 * For JSX/TSX/Next, `compiled` must contain the esbuild IIFE bundle.
 */
export function buildDocument(config: NormalizedRenderConfig, compiled?: CompileResult): BuiltDocument {
  const compiledCss = compiled?.css ? `<style>${escapeCloseScript(compiled.css)}</style>` : '';
  const fontRuntime =
    config.inputType === 'next'
      ? `<script>
          window.__rasterlyLoadFont = function (family) {
            try {
              var link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + '&display=swap';
              document.head.appendChild(link);
            } catch (e) {}
          };
        </script>`
      : '';

  const head = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${config.width}, initial-scale=1" />
    <style>${baseStyle(config)}</style>
    ${compiledCss}
    ${fontRuntime}
  `;

  let body: string;

  switch (config.inputType) {
    case 'css':
      body = `<style>${escapeCloseScript(config.code)}</style>${CSS_SHOWCASE}`;
      break;
    case 'jsx':
    case 'tsx':
    case 'next': {
      if (!compiled) {
        throw new Error(`Compiled bundle is required for ${config.inputType} input`);
      }
      body = `
        <div id="rasterly-root"></div>
        <script>${escapeCloseScript(compiled.code)}</script>
        <script>
          (function () {
            var mount = document.getElementById('rasterly-root');
            var mod = window.${compiled.globalName};
            var Component = mod && (mod.default || mod);
            if (typeof Component !== 'function' && typeof Component !== 'object') {
              mount.textContent = 'No component was exported.';
              return;
            }
            window.__RasterlyReactDOM.createRoot(mount).render(
              window.React.createElement(Component)
            );
          })();
        </script>`;
      break;
    }
    case 'html':
    default: {
      if (/<html[\s>]|<!doctype/i.test(config.code)) {
        body = config.code;
      } else {
        body = config.code;
      }
      break;
    }
  }

  // Full HTML documents are emitted verbatim; fragments get wrapped.
  if (config.inputType === 'html' && /<html[\s>]|<!doctype/i.test(config.code)) {
    return { html: config.code };
  }

  const html = `<!DOCTYPE html>
<html>
<head>${head}</head>
<body>${body}</body>
</html>`;
  return { html };
}