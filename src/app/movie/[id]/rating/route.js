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
  const visitorId = cookieStore.get('visitorId')?.value || nanoid(16);

  await getStore().addRating({
    movieId: id,
    visitorId,
    score
  });

  redirect(`/movie/${id}`);
}
