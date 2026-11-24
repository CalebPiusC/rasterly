#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderToImage, RenderError, closeSharedBrowser } from '../engine/index.js';
import type { InputType, OutputFormat, RenderConfig } from '../engine/index.js';

const HELP = `
Rasterly — convert code to an image.

Usage:
  rasterly <file|url> [options]
  cat code.tsx | rasterly --stdin [options]

Options:
  -o, --output <path>     Output file (default: rasterly.<ext>)
  -f, --format <fmt>      png | jpeg | webp (default: png)
  -t, --input-type <t>    html | css | jsx | tsx | next | url (default: auto)
  -w, --width <px>        Viewport width (default: 1200)
      --height <px>       Viewport height (default: 800)
  -s, --scale <1|2|3>     Device scale factor (default: 1)
  -b, --background <hex>  Background color (default: #ffffff)
      --transparent       Transparent background (png/webp)
      --full-page         Capture the full scrollable page
  -q, --quality <1-100>   Quality for jpeg/webp (default: 90)
      --timeout <ms>      Render timeout (default: 30000)
      --stdin             Read code from stdin
  -h, --help              Show this help
`.trim();

function parse(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      'input-type': { type: 'string', short: 't' },
      width: { type: 'string', short: 'w' },
      height: { type: 'string' },
      scale: { type: 'string', short: 's' },
      background: { type: 'string', short: 'b' },
      transparent: { type: 'boolean', default: false },
      'full-page': { type: 'boolean', default: false },
      quality: { type: 'string', short: 'q' },
      timeout: { type: 'string' },
      stdin: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });
  return { values, positionals };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const { values, positionals } = parse(process.argv.slice(2));

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  if (!values.stdin && positionals.length === 0) {
    console.log(HELP);
    process.exit(1);
  }

  const target = values.stdin ? '' : positionals[0];
  let code: string;
  let inputType: InputType | undefined = values['input-type'] as InputType | undefined;

  if (values.stdin) {
    code = await readStdin();
  } else if (target.startsWith('http://') || target.startsWith('https://')) {
    code = target;
    inputType = inputType ?? 'url';
  } else {
    code = await readFile(resolve(target), 'utf8');
  }

  const config: RenderConfig = {
    code,
    inputType: inputType ?? 'html',
    format: (values.format as OutputFormat) ?? 'png',
    width: Number(values.width ?? 1200),
    height: Number(values.height ?? 800),
    scale: (Number(values.scale ?? 1) as 1 | 2 | 3) ?? 1,
    fullPage: values['full-page'],
    transparent: values.transparent,
    backgroundColor: values.background ?? '#ffffff',
    quality: Number(values.quality ?? 90),
    timeoutMs: values.timeout ? Number(values.timeout) : undefined,
  };

  try {
    const result = await renderToImage(config);
    const ext = result.extension;
    const out = values.output ?? `rasterly.${ext}`;
    await writeFile(resolve(out), result.buffer);
    console.log(
      `Rendered ${result.metadata.width}x${result.metadata.height} ${result.mimeType} ` +
        `(${result.metadata.bytes} bytes) -> ${out}`,
    );
  } catch (error) {
    if (error instanceof RenderError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      if (error.detail) console.error(`  ${error.detail}`);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exitCode = 1;
  } finally {
    await closeSharedBrowser();
  }
}

main();