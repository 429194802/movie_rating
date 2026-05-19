import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool(createPoolConfig());

try {
  await applyComments();
  console.log('Applied MySQL table and column comments.');
} finally {
  await pool.end();
}

function createPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 1,
      charset: 'utf8mb4'
    };
  }

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'movie_rating',
    waitForConnections: true,
    connectionLimit: 1,
    charset: 'utf8mb4'
  };
}

async function applyComments() {
  await pool.query(`
    ALTER TABLE movies
      COMMENT = '电影基础信息表',
      MODIFY id VARCHAR(64) NOT NULL COMMENT '豆瓣电影条目 ID',
      MODIFY title VARCHAR(255) NOT NULL COMMENT '电影标题',
      MODIFY douban_score DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT '豆瓣评分，0 表示暂无',
      MODIFY douban_votes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '豆瓣评分人数或标记人数',
      MODIFY release_date VARCHAR(64) NOT NULL DEFAULT '' COMMENT '上映日期文本',
      MODIFY duration VARCHAR(64) NOT NULL DEFAULT '' COMMENT '片长文本',
      MODIFY region VARCHAR(128) NOT NULL DEFAULT '' COMMENT '制片国家或地区',
      MODIFY genre VARCHAR(128) NOT NULL DEFAULT '' COMMENT '电影类型',
      MODIFY directors JSON NOT NULL COMMENT '导演列表 JSON 数组',
      MODIFY casts JSON NOT NULL COMMENT '主演列表 JSON 数组',
      MODIFY poster TEXT NOT NULL COMMENT '海报原始 URL',
      MODIFY douban_url TEXT NOT NULL COMMENT '豆瓣电影详情页 URL',
      MODIFY is_showing TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否当前正在上映，1 是，0 否',
      MODIFY source_updated_at DATETIME(3) NULL COMMENT '最近一次从豆瓣同步该电影的时间'
  `);

  await pool.query(`
    ALTER TABLE ratings
      COMMENT = '用户评分表',
      MODIFY id CHAR(36) NOT NULL COMMENT '评分记录 UUID',
      MODIFY movie_id VARCHAR(64) NOT NULL COMMENT '关联电影 ID',
      MODIFY visitor_id VARCHAR(64) NOT NULL COMMENT '访客匿名 ID，来自 cookie',
      MODIFY score DECIMAL(3,1) NOT NULL COMMENT '用户评分，范围 1 到 10',
      MODIFY created_at DATETIME(3) NOT NULL COMMENT '评分创建时间',
      MODIFY updated_at DATETIME(3) NOT NULL COMMENT '评分最后更新时间'
  `);

  await pool.query(`
    ALTER TABLE comments
      COMMENT = '用户评论表',
      MODIFY id CHAR(36) NOT NULL COMMENT '评论记录 UUID',
      MODIFY movie_id VARCHAR(64) NOT NULL COMMENT '关联电影 ID',
      MODIFY visitor_id VARCHAR(64) NOT NULL COMMENT '访客匿名 ID，来自 cookie',
      MODIFY author VARCHAR(24) NOT NULL COMMENT '评论昵称',
      MODIFY body VARCHAR(800) NOT NULL COMMENT '评论正文',
      MODIFY created_at DATETIME(3) NOT NULL COMMENT '评论创建时间'
  `);

  await pool.query(`
    ALTER TABLE sync_status
      COMMENT = '豆瓣同步状态表',
      MODIFY id TINYINT NOT NULL COMMENT '固定记录 ID，始终为 1',
      MODIFY last_run_at DATETIME(3) NULL COMMENT '最近一次同步尝试时间',
      MODIFY last_success_at DATETIME(3) NULL COMMENT '最近一次同步成功时间',
      MODIFY last_error TEXT NULL COMMENT '最近一次同步失败错误信息'
  `);
}
