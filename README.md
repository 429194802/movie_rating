# 新片评分

一个基于 Next.js 的轻量电影评分和评论网站。应用会定时抓取豆瓣“正在上映”电影列表，用户可以对电影打分并发表评论。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:3000`。

## 常用命令

```bash
npm run sync       # 手动同步豆瓣正在上映电影
npm run check      # Node 语法检查
npm run build      # 构建 Next.js 应用
npm run verify:ui  # 用 Playwright 检查首页、详情、评分和评论
npm start          # 生产模式启动自定义 Next.js 服务器
```

## 架构

- `src/app/`：Next.js App Router 页面和 route handlers
- `src/server.js`：生产用自定义 Next.js 启动器，保留启动时同步和 `node-cron` 定时同步
- `src/lib/store.js`：JSON 文件存储、评分和评论聚合
- `src/lib/douban.js`：豆瓣正在上映页面抓取与解析
- `scripts/`：手动同步和 UI 验证脚本
- `data/`：运行时持久化数据

开发模式使用标准 `next dev`，如果本地数据为空，可以先运行 `npm run sync` 导入一次。

## 部署

仓库包含 `render.yaml` 和 `Dockerfile`，可以直接在 Render 使用 Blueprint 部署。生产环境建议挂载持久磁盘，并将 `DATA_FILE` 设置为 `/data/store.json`。

如果部署到自己的阿里云 ECS，参考 `deploy/ALIYUN_ECS.md`。

部署后检查：

- `/` 检查电影列表
- `/movie/:id` 检查评分和评论
- `/admin/sync?token=<ADMIN_SYNC_TOKEN>` 手动触发同步

也可以运行 `BASE_URL=https://your-site.example npm run verify:ui` 对公网地址做浏览器验收。
