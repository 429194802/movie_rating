import { fetchNowPlaying } from './douban.js';
import { getStore } from './store.js';

export async function syncMovies(city = process.env.DOUBAN_CITY || 'beijing') {
  const movies = await fetchNowPlaying(city);
  await getStore().upsertMovies(movies);
  return movies.length;
}
