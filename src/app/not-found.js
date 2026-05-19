import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell empty">
      <h1>没有找到这部电影</h1>
      <p className="muted">它可能已经下映，或还没有被同步到本站。</p>
      <Link className="button" href="/">返回首页</Link>
    </main>
  );
}
