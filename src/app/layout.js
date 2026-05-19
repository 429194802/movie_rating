import Link from 'next/link';
import './globals.css';

const siteName = process.env.SITE_NAME || '新片评分';

export const metadata = {
  title: siteName,
  description: '一个轻量电影评分和评论网站。'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">{siteName}</Link>
        </header>
        {children}
        <footer className="footer">
          <span>数据来源于公开电影条目信息，本站评分由用户独立提交。</span>
        </footer>
      </body>
    </html>
  );
}
