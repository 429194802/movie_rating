import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStore } from '../../../lib/store.js';

export const dynamic = 'force-dynamic';

function posterUrl(poster) {
  return `/poster?url=${encodeURIComponent(poster)}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('zh-CN');
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const movie = await getStore().getMovie(id);
  const siteName = process.env.SITE_NAME || '新片评分';

  return {
    title: movie ? `${movie.title} - ${siteName}` : siteName
  };
}

export default async function MoviePage({ params }) {
  const { id } = await params;
  const movie = await getStore().getMovie(id);

  if (!movie) notFound();

  return (
    <main className="shell">
      <Link className="back-link" href="/">返回列表</Link>
      <section className="detail">
        <div className="detail-poster">
          {movie.poster ? (
            <img src={posterUrl(movie.poster)} alt={`${movie.title} 海报`} />
          ) : (
            <div className="poster-fallback large">{movie.title.slice(0, 2)}</div>
          )}
        </div>
        <div className="detail-main">
          <p className="eyebrow">{[movie.genre, movie.region].filter(Boolean).join(' / ') || '电影'}</p>
          <h1>{movie.title}</h1>
          <p className="meta">{[movie.releaseDate, movie.duration].filter(Boolean).join(' / ')}</p>
          <div className="ratings">
            <div>
              <span>本站评分</span>
              <strong>{movie.averageScore || '暂无'}</strong>
              <small>{movie.ratingCount} 人评分</small>
            </div>
            <div>
              <span>豆瓣评分</span>
              <strong>{movie.doubanScore || '暂无'}</strong>
              <small>{movie.doubanVotes || 0} 人标记</small>
            </div>
          </div>
          {movie.directors.length ? <p><strong>导演：</strong>{movie.directors.join('、')}</p> : null}
          {movie.casts.length ? <p><strong>主演：</strong>{movie.casts.join('、')}</p> : null}
          <a className="douban-link" href={movie.doubanUrl} rel="noreferrer" target="_blank">查看豆瓣条目</a>
        </div>
      </section>

      <section className="forms">
        <form method="post" action={`/movie/${movie.id}/rating`} className="panel">
          <h2>给这部电影评分</h2>
          <label htmlFor="score">评分（1-10）</label>
          <input id="score" name="score" type="number" min="1" max="10" step="1" required />
          <button type="submit">提交评分</button>
        </form>

        <form method="post" action={`/movie/${movie.id}/comments`} className="panel">
          <h2>写短评</h2>
          <label htmlFor="author">昵称</label>
          <input id="author" name="author" maxLength="24" placeholder="匿名用户" />
          <label htmlFor="body">评论</label>
          <textarea id="body" name="body" minLength="2" maxLength="800" required />
          <button type="submit">发布评论</button>
        </form>
      </section>

      <section id="comments" className="comments">
        <h2>观众评论</h2>
        {!movie.comments.length ? <p className="muted">还没有评论。</p> : null}
        {movie.comments.map((comment) => (
          <article className="comment" key={comment.id}>
            <div>
              <strong>{comment.author}</strong>
              <time>{formatDateTime(comment.createdAt)}</time>
            </div>
            <p>{comment.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
