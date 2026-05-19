import Link from 'next/link';
import { getStore } from '../lib/store.js';

const siteName = process.env.SITE_NAME || '新片评分';

export const dynamic = 'force-dynamic';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '尚未成功同步';
}

function posterUrl(poster) {
  return `/poster?url=${encodeURIComponent(poster)}`;
}

export default async function HomePage() {
  const store = getStore();
  const [movies, sync] = await Promise.all([store.listMovies(), store.syncStatus()]);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">正在上映</p>
          <h1>{siteName}</h1>
          <p className="lead">一个只关注观众真实反馈的新片评分站。电影列表会定时从豆瓣正在上映页面同步。</p>
        </div>
        <div className="sync-card">
          <span>最近同步</span>
          <strong>{formatDateTime(sync.lastSuccessAt)}</strong>
          {sync.lastError ? <small>同步错误：{sync.lastError}</small> : null}
        </div>
      </section>

      {!movies.length ? (
        <section className="empty">
          <h2>还没有电影数据</h2>
          <p>应用启动后会自动同步一次，也可以运行 <code>npm run sync</code> 手动导入。</p>
        </section>
      ) : (
        <section className="movie-grid" aria-label="电影列表">
          {movies.map((movie) => (
            <article className="movie-card" key={movie.id}>
              <Link href={`/movie/${movie.id}`} className="poster-link">
                {movie.poster ? (
                  <img src={posterUrl(movie.poster)} alt={`${movie.title} 海报`} />
                ) : (
                  <div className="poster-fallback">{movie.title.slice(0, 2)}</div>
                )}
              </Link>
              <div className="movie-card-body">
                <h2><Link href={`/movie/${movie.id}`}>{movie.title}</Link></h2>
                <p>{[movie.genre, movie.region, movie.releaseDate].filter(Boolean).join(' / ')}</p>
                <div className="score-row">
                  <span>本站 <strong>{movie.averageScore || '暂无'}</strong></span>
                  <span>豆瓣 <strong>{movie.doubanScore || '暂无'}</strong></span>
                </div>
                <Link className="button" href={`/movie/${movie.id}`}>评分与评论</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
