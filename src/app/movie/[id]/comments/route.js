import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getStore } from '../../../../lib/store.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const form = await request.formData();
  const body = String(form.get('body') || '').trim();

  if (body.length < 2) {
    return new Response('评论至少需要 2 个字符。', { status: 400 });
  }

  const cookieStore = await cookies();
  const visitorId = cookieStore.get('visitorId')?.value || nanoid(16);

  await getStore().addComment({
    movieId: id,
    visitorId,
    author: String(form.get('author') || ''),
    body
  });

  redirect(`/movie/${id}#comments`);
}
