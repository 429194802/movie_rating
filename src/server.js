import 'dotenv/config';
import { createServer } from 'node:http';
import next from 'next';
import cron from 'node-cron';
import { fetchNowPlaying } from './lib/douban.js';
import { getStore } from './lib/store.js';

const port = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== 'production' && process.env.npm_lifecycle_event !== 'start';
const hostname = process.env.HOSTNAME || (dev ? '127.0.0.1' : '0.0.0.0');
const siteName = process.env.SITE_NAME || '新片评分';
const city = process.env.DOUBAN_CITY || 'beijing';
const syncCron = process.env.SYNC_CRON || '0 */6 * * *';

const app = next({ dev, hostname, port, dir: process.cwd() });
const handle = app.getRequestHandler();
const store = getStore();

async function syncMovies() {
  const movies = await fetchNowPlaying(city);
  await store.upsertMovies(movies);
  return movies.length;
}

function scheduleSync() {
  syncMovies().catch(async (error) => {
    await store.recordSyncFailure(error);
    console.error('Initial sync failed:', error.message);
  });

  if (cron.validate(syncCron)) {
    cron.schedule(syncCron, () => {
      syncMovies().catch(async (error) => {
        store.recordSyncFailure(error).catch(console.error);
        console.error('Scheduled sync failed:', error.message);
      });
    });
  }
}

await store.init();
await app.prepare();
scheduleSync();

createServer((request, response) => {
  handle(request, response);
}).listen(port, hostname, () => {
  console.log(`${siteName} listening on http://localhost:${port}`);
});
