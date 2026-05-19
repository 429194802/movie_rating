import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getStore } from '../../../../lib/store.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const form = await request.formData();
  const score = Number(form.get('score'));

  if (!Number.isFinite(score) || score < 1 || score > 10) {
    return new Response('评分必须在 1 到 10 之间。', { status: 400 });
  }

  const cookieStore = await cookies();
  const visitorCookie = cookieStore.get('visitorId')?.value;
  const visitorId = visitorCookie || nanoid(16);
  const store = getStore();
  const movie = await store.getMovie(id);

  if (!movie) {
    return new Response('没有找到这部电影。', { status: 404 });
  }

  if (!visitorCookie) {
    cookieStore.set('visitorId', visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    });
  }

  await store.addRating({
    movieId: id,
    visitorId,
    score
  });

  redirect(`/movie/${id}`);
}
