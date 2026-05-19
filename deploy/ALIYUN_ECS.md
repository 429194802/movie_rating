# 阿里云 ECS 部署操作文档

本文档用于把“新片评分”Next.js 项目部署到自己的阿里云 ECS。推荐系统为 Ubuntu 22.04 或 Ubuntu 24.04，以下命令默认使用 `root` 用户执行。

示例占位符：

- `your-server-ip`：你的 ECS 公网 IP
- `your-domain.example`：你的域名；没有域名时可先使用公网 IP
- `<your-repo-url>`：项目 Git 仓库地址
- `replace-with-a-long-random-token`：后台同步接口密钥
- `replace-with-a-strong-password`：MySQL 应用用户密码

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
apt install -y git nginx curl ca-certificates mysql-server
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

确认 Node.js 版本为 20 或更高。

确认 MySQL 服务运行：

```bash
systemctl enable --now mysql
systemctl status mysql
```

初始化 MySQL 8 数据库和应用用户：

```bash
mysql -uroot
```

```sql
CREATE DATABASE movie_rating CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'movie_rating'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON movie_rating.* TO 'movie_rating'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

如果你的阿里云系统默认不是 MySQL 8，而是 MariaDB 或旧版本 MySQL，建议改用阿里云 RDS MySQL 8，或按系统版本安装官方 MySQL 8 源。

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
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=movie_rating
MYSQL_PASSWORD=replace-with-a-strong-password
MYSQL_DATABASE=movie_rating
DOUBAN_CITY=beijing
ADMIN_SYNC_TOKEN=replace-with-a-long-random-token
```

注意：

- 评分和评论会保存到 MySQL 8，不再依赖服务器本地 JSON 文件。
- `DOUBAN_CITY` 当前示例为 `beijing`，可按需调整。
- `ADMIN_SYNC_TOKEN` 必须改成足够长的随机字符串。

## 6. 初始化电影数据

应用启动或执行脚本时会自动创建表，并带有表注释和字段注释。首次上线有两种方式初始化数据。

### 方式 A：重新同步豆瓣正在上映电影

```bash
npm run sync
```

正常情况下会看到类似输出：

```text
Imported 52 movies from Douban city "beijing".
```

### 方式 B：迁移本地旧数据

先把本地 `data/store.json` 上传到服务器：

```bash
scp data/store.json root@your-server-ip:/opt/movie_rating/data/store.json
```

在服务器执行迁移：

```bash
cd /opt/movie_rating
npm run migrate:mysql
```

如果表已经存在但没有注释，执行：

```bash
npm run db:comments
```

检查表和字段注释：

```bash
mysql -umovie_rating -p movie_rating -e "SHOW TABLE STATUS WHERE Name IN ('movies','ratings','comments','sync_status')\G"
mysql -umovie_rating -p movie_rating -e "SHOW FULL COLUMNS FROM movies; SHOW FULL COLUMNS FROM ratings; SHOW FULL COLUMNS FROM comments; SHOW FULL COLUMNS FROM sync_status;"
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

确认服务连接的是同一个 MySQL 数据库：

```bash
cat /opt/movie_rating/.env
mysql -umovie_rating -p movie_rating -e "SELECT COUNT(*) FROM comments; SELECT COUNT(*) FROM ratings;"
```
