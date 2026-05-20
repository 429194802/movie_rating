import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getStore } from '../../../../lib/store.js';
import { appPath, basePath } from '../../../../lib/paths.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const form = await request.formData();
  const body = String(form.get('body') || '').trim();

  if (body.length < 2) {
    return new Response('评论至少需要 2 个字符。', { status: 400 });
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
      path: basePath || '/',
      maxAge: 60 * 60 * 24 * 365
    });
  }

  await store.addComment({
    movieId: id,
    visitorId,
    author: String(form.get('author') || ''),
    body
  });

  redirect(appPath(`/movie/${id}#comments`));
}
