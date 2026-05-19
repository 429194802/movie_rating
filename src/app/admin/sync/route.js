import { fetchNowPlaying } from '../../../lib/douban.js';
import { getStore } from '../../../lib/store.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const adminToken = process.env.ADMIN_SYNC_TOKEN || '';

  if (!adminToken || request.nextUrl.searchParams.get('token') !== adminToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const movies = await fetchNowPlaying(process.env.DOUBAN_CITY || 'beijing');
  await getStore().upsertMovies(movies);

  return Response.json({ imported: movies.length });
}
