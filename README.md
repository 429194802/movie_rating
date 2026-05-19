# 新片评分

一个轻量电影评分和评论网站。应用会定时抓取豆瓣「正在上映」电影列表，用户可以对电影打分并发表评论。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:3000`。

## 常用命令

```bash
npm run sync   # 手动同步豆瓣正在上映电影
npm run check  # 语法检查
npm run verify:ui # 用 Playwright 检查首页、详情、评分和评论
npm start      # 生产模式启动
```

## 部署

仓库包含 `render.yaml` 和 `Dockerfile`，可以直接在 Render 使用 Blueprint 部署。生产环境建议挂载持久磁盘，并将 `DATA_FILE` 设置为 `/data/store.json`。

如果部署到自己的阿里云 ECS，参考 `deploy/ALIYUN_ECS.md`。

部署后打开：

- `/` 检查电影列表
- `/movie/:id` 检查评分和评论
- `/admin/sync?token=<ADMIN_SYNC_TOKEN>` 手动触发同步

也可以运行 `BASE_URL=https://your-site.example npm run verify:ui` 对公网地址做浏览器验收。
