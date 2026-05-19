export const dynamic = 'force-dynamic';

export async function GET(request) {
  const imageUrl = request.nextUrl.searchParams.get('url') || '';

  if (!imageUrl.startsWith('https://img') || !imageUrl.includes('doubanio.com/')) {
    return new Response('Invalid poster URL', { status: 400 });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      Referer: 'https://movie.douban.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; MovieRatingBot/1.0)'
    }
  });

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
