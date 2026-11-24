import { createApp, loadConfig } from './app.js';
import { closeSharedBrowser } from '../engine/browser.js';

async function main() {
  const config = loadConfig();
  const app = createApp(config);
  const server = app.listen(config.port, config.host, () => {
    console.log(`Rasterly server listening on http://${config.host}:${config.port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await closeSharedBrowser();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});