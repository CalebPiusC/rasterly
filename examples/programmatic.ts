/**
 * Programmatic usage of the Rasterly rendering engine.
 * Run with:  npx tsx examples/programmatic.ts
 */
import { renderToImage, closeSharedBrowser } from '../src/engine/index.js';

async function main() {
  const result = await renderToImage({
    code: `
      function App() {
        return (
          <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1 style={{ color: '#5b8cff' }}>Hello from Rasterly</h1>
            <p>Rendered with the programmatic API.</p>
          </div>
        );
      }
    `,
    inputType: 'jsx',
    format: 'png',
    width: 600,
    height: 300,
    scale: 2,
    fullPage: false,
    transparent: false,
    backgroundColor: '#0f0f12',
    quality: 90,
  });

  console.log('Generated', result.mimeType, result.metadata);
  // result.buffer is a Node.js Buffer you can write to disk or send over HTTP.
  const { writeFile } = await import('node:fs/promises');
  await writeFile('example-output.png', result.buffer);
  console.log('Wrote example-output.png');

  await closeSharedBrowser();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});