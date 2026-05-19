import 'dotenv/config';
import { getStore } from '../src/lib/store.js';
import { syncMovies } from '../src/lib/sync.js';

const city = process.env.DOUBAN_CITY || 'beijing';

try {
  const imported = await syncMovies(city);
  console.log(`Imported ${imported} movies from Douban city "${city}".`);
} catch (error) {
  await getStore().recordSyncFailure(error);
  console.error(error);
  process.exitCode = 1;
}
