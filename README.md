# 新片评分

一个基于 Next.js App Router 的轻量电影评分和评论网站。应用会同步豆瓣“正在上映”电影列表，用户可以对电影打分并发表评论。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:3000`。

如果本地数据为空，可以先运行：

```bash
npm run sync
```

## 常用命令

```bash
npm run dev       # 启动 Next.js 开发服务器
npm run build     # 构建 Next.js 应用
npm start         # 使用 next start 启动生产服务
npm run sync      # 手动同步豆瓣正在上映电影
npm run check     # JavaScript 语法检查
npm run verify:ui # 用 Playwright 检查首页、详情、评分和评论
```

## 架构

- `src/app/`：Next.js App Router 页面和 route handlers
- `src/app/page.js`：首页电影列表
- `src/app/movie/[id]/page.js`：电影详情页
- `src/app/movie/[id]/rating/route.js`：评分提交接口
- `src/app/movie/[id]/comments/route.js`：评论提交接口
- `src/app/admin/sync/route.js`：后台手动同步接口
- `src/app/poster/route.js`：豆瓣海报代理接口
- `src/lib/store.js`：JSON 文件存储、评分和评论聚合
- `src/lib/douban.js`：豆瓣正在上映页面抓取与解析
- `src/lib/sync.js`：共享同步入口，供 `/admin/sync` 和 `npm run sync` 使用
- `scripts/`：手动同步和 UI 验证脚本
- `data/`：运行时持久化数据

项目开发和生产入口分别是 `next dev` 和 `next start`，目录结构按 Next.js App Router 组织。

## 部署

仓库包含 `render.yaml` 和 `Dockerfile`，可以直接在 Render 使用 Blueprint 部署。生产环境建议挂载持久磁盘，并将 `DATA_FILE` 设置为 `/data/store.json`。

如果部署到自己的阿里云 ECS，参考 `deploy/ALIYUN_ECS.md`。

定时同步建议用平台 Cron、系统 cron 或其他外部调度器定时请求 `/admin/sync?token=<ADMIN_SYNC_TOKEN>`；也可以在服务器上运行 `npm run sync`。

部署后检查：

- `/` 检查电影列表
- `/movie/:id` 检查评分和评论
- `/admin/sync?token=<ADMIN_SYNC_TOKEN>` 手动触发同步

也可以运行 `BASE_URL=https://your-site.example npm run verify:ui` 对公网地址做浏览器验收。
