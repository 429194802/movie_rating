import { syncMovies } from '../../../lib/sync.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const adminToken = process.env.ADMIN_SYNC_TOKEN || '';

  if (!adminToken || request.nextUrl.searchParams.get('token') !== adminToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const imported = await syncMovies();

  return Response.json({ imported });
}
