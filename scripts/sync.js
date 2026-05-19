import 'dotenv/config';
import path from 'node:path';
import { fetchNowPlaying } from '../src/lib/douban.js';
import { Store } from '../src/lib/store.js';

const dataFile = path.resolve(process.env.DATA_FILE || './data/store.json');
const city = process.env.DOUBAN_CITY || 'beijing';
const store = new Store(dataFile);

try {
  const movies = await fetchNowPlaying(city);
  await store.upsertMovies(movies);
  console.log(`Imported ${movies.length} movies from Douban city "${city}".`);
} catch (error) {
  await store.recordSyncFailure(error);
  console.error(error);
  process.exitCode = 1;
}
