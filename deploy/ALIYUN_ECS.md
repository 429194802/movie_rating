# 阿里云 ECS 部署操作文档

本文档用于把“新片评分”Next.js 项目部署到自己的阿里云 ECS。推荐系统为 Ubuntu 22.04 或 Ubuntu 24.04，以下命令默认使用 `root` 用户执行。

示例占位符：

- `your-server-ip`：你的 ECS 公网 IP
- `your-domain.example`：你的域名；没有域名时可先使用公网 IP
- `<your-repo-url>`：项目 Git 仓库地址
- `replace-with-a-long-random-token`：后台同步接口密钥

## 1. 部署前检查

在阿里云控制台确认 ECS 安全组已经放行：

- `22/tcp`：SSH 登录
- `80/tcp`：HTTP 访问
- `443/tcp`：HTTPS 访问，配置证书时需要

如果使用域名，先在域名 DNS 中添加 A 记录，指向 ECS 公网 IP。

## 2. 登录服务器

```bash
ssh root@your-server-ip
```

如果 SSH 端口不是 22：

```bash
ssh -p your-ssh-port root@your-server-ip
```

## 3. 安装系统依赖

```bash
apt update
apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

确认 Node.js 版本为 20 或更高。

## 4. 获取项目代码

```bash
git clone <your-repo-url> /opt/movie_rating
cd /opt/movie_rating
npm ci
npm run build
npm prune --omit=dev
```

## 5. 配置生产环境变量

```bash
cd /opt/movie_rating
cp .env.example .env
nano .env
```

建议内容如下：

```env
PORT=3000
SITE_NAME=新片评分
DATA_FILE=/opt/movie_rating/data/store.json
DOUBAN_CITY=beijing
ADMIN_SYNC_TOKEN=replace-with-a-long-random-token
```

注意：

- `DATA_FILE` 是服务端数据文件位置，评分和评论会保存到这里。
- `DOUBAN_CITY` 当前示例为 `beijing`，可按需调整。
- `ADMIN_SYNC_TOKEN` 必须改成足够长的随机字符串。

## 6. 初始化电影数据

```bash
mkdir -p data
npm run sync
```

正常情况下会看到类似输出：

```text
Imported 52 movies from Douban city "beijing".
```

## 7. 配置 systemd 后台服务

```bash
cp deploy/systemd/movie-rating.service /etc/systemd/system/movie-rating.service
chown -R www-data:www-data /opt/movie_rating
systemctl daemon-reload
systemctl enable --now movie-rating
systemctl status movie-rating
```

服务通过 `npm start` 启动，也就是标准的 `next start`。

查看服务日志：

```bash
journalctl -u movie-rating -f
```

## 8. 配置 Nginx 反向代理

先编辑 Nginx 配置模板：

```bash
nano /opt/movie_rating/deploy/nginx/movie-rating.conf
```

把这一行：

```nginx
server_name your-domain.example;
```

改成你的域名或公网 IP，例如：

```nginx
server_name example.com;
```

没有域名时可以临时写：

```nginx
server_name _;
```

启用配置：

```bash
cp /opt/movie_rating/deploy/nginx/movie-rating.conf /etc/nginx/sites-available/movie-rating
ln -s /etc/nginx/sites-available/movie-rating /etc/nginx/sites-enabled/movie-rating
nginx -t
systemctl reload nginx
```

现在访问：

```text
http://your-domain.example
```

或：

```text
http://your-server-ip
```

## 9. 配置 HTTPS

如果你有域名，并且域名已经解析到 ECS：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.example
```

完成后访问：

```text
https://your-domain.example
```

## 10. 部署后验收

用浏览器打开公网地址，逐项检查：

- 首页能显示电影列表和海报。
- 点击电影能进入详情页。
- 评分提交后，本站评分会更新。
- 评论提交后，评论会显示在详情页。
- `/admin/sync?token=<ADMIN_SYNC_TOKEN>` 可以手动触发同步。

如果服务器安装了开发依赖，也可以运行自动验收：

```bash
BASE_URL=https://your-domain.example npm run verify:ui
```

## 11. 日常维护命令

重启应用：

```bash
systemctl restart movie-rating
```

查看运行日志：

```bash
journalctl -u movie-rating -f
```

手动同步豆瓣正在上映电影：

```bash
cd /opt/movie_rating
npm run sync
```

配置系统 cron 定时同步：

```bash
crontab -e
```

加入：

```cron
0 */6 * * * cd /opt/movie_rating && npm run sync >> /var/log/movie-rating-sync.log 2>&1
```

检查 Nginx 配置：

```bash
nginx -t
```

重载 Nginx：

```bash
systemctl reload nginx
```

## 12. 常见问题

### 页面打不开

检查安全组是否放行 `80/tcp`，再检查 Nginx：

```bash
systemctl status nginx
nginx -t
```

### 502 Bad Gateway

通常是 Next.js 服务没有启动：

```bash
systemctl status movie-rating
journalctl -u movie-rating -n 100
```

### 没有电影数据

手动执行同步：

```bash
cd /opt/movie_rating
npm run sync
```

### 评分或评论丢失

确认 `DATA_FILE` 指向服务器持久路径：

```bash
cat /opt/movie_rating/.env
ls -lh /opt/movie_rating/data/
```
