import mysql from 'mysql2/promise';

let sharedStore;

export function getStore() {
  if (!sharedStore) {
    sharedStore = new Store(createPoolConfig());
  }

  return sharedStore;
}

function createPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
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
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    charset: 'utf8mb4'
  };
}

export class Store {
  constructor(poolConfig) {
    this.pool = mysql.createPool(poolConfig);
    this.ready = this.init();
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id VARCHAR(64) PRIMARY KEY COMMENT '豆瓣电影条目 ID',
        title VARCHAR(255) NOT NULL COMMENT '电影标题',
        douban_score DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT '豆瓣评分，0 表示暂无',
        douban_votes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '豆瓣评分人数或标记人数',
        release_date VARCHAR(64) NOT NULL DEFAULT '' COMMENT '上映日期文本',
        duration VARCHAR(64) NOT NULL DEFAULT '' COMMENT '片长文本',
        region VARCHAR(128) NOT NULL DEFAULT '' COMMENT '制片国家或地区',
        genre VARCHAR(128) NOT NULL DEFAULT '' COMMENT '电影类型',
        directors JSON NOT NULL COMMENT '导演列表 JSON 数组',
        casts JSON NOT NULL COMMENT '主演列表 JSON 数组',
        poster TEXT NOT NULL COMMENT '海报原始 URL',
        douban_url TEXT NOT NULL COMMENT '豆瓣电影详情页 URL',
        is_showing TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否当前正在上映，1 是，0 否',
        source_updated_at DATETIME(3) NULL COMMENT '最近一次从豆瓣同步该电影的时间',
        INDEX idx_movies_showing (is_showing)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='电影基础信息表'
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id CHAR(36) PRIMARY KEY COMMENT '评分记录 UUID',
        movie_id VARCHAR(64) NOT NULL COMMENT '关联电影 ID',
        visitor_id VARCHAR(64) NOT NULL COMMENT '访客匿名 ID，来自 cookie',
        score DECIMAL(3,1) NOT NULL COMMENT '用户评分，范围 1 到 10',
        created_at DATETIME(3) NOT NULL COMMENT '评分创建时间',
        updated_at DATETIME(3) NOT NULL COMMENT '评分最后更新时间',
        UNIQUE KEY uq_ratings_movie_visitor (movie_id, visitor_id),
        INDEX idx_ratings_movie (movie_id),
        CONSTRAINT fk_ratings_movie
          FOREIGN KEY (movie_id) REFERENCES movies(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户评分表'
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id CHAR(36) PRIMARY KEY COMMENT '评论记录 UUID',
        movie_id VARCHAR(64) NOT NULL COMMENT '关联电影 ID',
        visitor_id VARCHAR(64) NOT NULL COMMENT '访客匿名 ID，来自 cookie',
        author VARCHAR(24) NOT NULL COMMENT '评论昵称',
        body VARCHAR(800) NOT NULL COMMENT '评论正文',
        created_at DATETIME(3) NOT NULL COMMENT '评论创建时间',
        INDEX idx_comments_movie_created (movie_id, created_at),
        CONSTRAINT fk_comments_movie
          FOREIGN KEY (movie_id) REFERENCES movies(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户评论表'
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id TINYINT PRIMARY KEY COMMENT '固定记录 ID，始终为 1',
        last_run_at DATETIME(3) NULL COMMENT '最近一次同步尝试时间',
        last_success_at DATETIME(3) NULL COMMENT '最近一次同步成功时间',
        last_error TEXT NULL COMMENT '最近一次同步失败错误信息'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='豆瓣同步状态表'
    `);

    await this.pool.query(`
      INSERT IGNORE INTO sync_status (id, last_run_at, last_success_at, last_error)
      VALUES (1, NULL, NULL, NULL)
    `);
  }

  async upsertMovies(incomingMovies) {
    await this.ready;
    const connection = await this.pool.getConnection();
    const now = new Date();

    try {
      await connection.beginTransaction();
      await connection.query('UPDATE movies SET is_showing = 0');

      const sql = `
        INSERT INTO movies (
          id, title, douban_score, douban_votes, release_date, duration, region, genre,
          directors, casts, poster, douban_url, is_showing, source_updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          douban_score = VALUES(douban_score),
          douban_votes = VALUES(douban_votes),
          release_date = VALUES(release_date),
          duration = VALUES(duration),
          region = VALUES(region),
          genre = VALUES(genre),
          directors = VALUES(directors),
          casts = VALUES(casts),
          poster = VALUES(poster),
          douban_url = VALUES(douban_url),
          is_showing = 1,
          source_updated_at = VALUES(source_updated_at)
      `;

      for (const movie of incomingMovies) {
        await connection.query(sql, [
          movie.id,
          movie.title,
          movie.doubanScore || 0,
          movie.doubanVotes || 0,
          movie.releaseDate || '',
          movie.duration || '',
          movie.region || '',
          movie.genre || '',
          JSON.stringify(movie.directors || []),
          JSON.stringify(movie.casts || []),
          movie.poster || '',
          movie.doubanUrl || '',
          now
        ]);
      }

      await connection.query(`
        UPDATE sync_status
        SET last_run_at = ?, last_success_at = ?, last_error = NULL
        WHERE id = 1
      `, [now, now]);

      await connection.commit();
      return incomingMovies.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordSyncFailure(error) {
    await this.ready;
    await this.pool.query(`
      UPDATE sync_status
      SET last_run_at = ?, last_error = ?
      WHERE id = 1
    `, [new Date(), error.message]);
  }

  async listMovies() {
    await this.ready;
    const [rows] = await this.pool.query(`
      SELECT
        m.*,
        COALESCE(rs.rating_count, 0) AS rating_count,
        COALESCE(rs.average_score, 0) AS average_score
      FROM movies m
      LEFT JOIN (
        SELECT movie_id, COUNT(*) AS rating_count, AVG(score) AS average_score
        FROM ratings
        GROUP BY movie_id
      ) rs ON rs.movie_id = m.id
      WHERE m.is_showing = 1
      ORDER BY average_score DESC, m.source_updated_at DESC
    `);

    return rows.map((row) => this.mapMovieRow(row));
  }

  async getMovie(id) {
    await this.ready;
    const [rows] = await this.pool.query(`
      SELECT
        m.*,
        COALESCE(rs.rating_count, 0) AS rating_count,
        COALESCE(rs.average_score, 0) AS average_score
      FROM movies m
      LEFT JOIN (
        SELECT movie_id, COUNT(*) AS rating_count, AVG(score) AS average_score
        FROM ratings
        GROUP BY movie_id
      ) rs ON rs.movie_id = m.id
      WHERE m.id = ?
      LIMIT 1
    `, [id]);

    if (!rows.length) return null;

    const [comments] = await this.pool.query(`
      SELECT id, movie_id, visitor_id, author, body, created_at
      FROM comments
      WHERE movie_id = ?
      ORDER BY created_at DESC
    `, [id]);

    return {
      ...this.mapMovieRow(rows[0]),
      comments: comments.map((comment) => ({
        id: comment.id,
        movieId: comment.movie_id,
        visitorId: comment.visitor_id,
        author: comment.author,
        body: comment.body,
        createdAt: toISOString(comment.created_at)
      }))
    };
  }

  async addRating({ id, movieId, visitorId, score, createdAt, updatedAt }) {
    await this.ready;
    const normalizedScore = Math.max(1, Math.min(10, Number(score)));
    const created = createdAt ? new Date(createdAt) : new Date();
    const updated = updatedAt ? new Date(updatedAt) : created;

    await this.pool.query(`
      INSERT INTO ratings (id, movie_id, visitor_id, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score = VALUES(score),
        updated_at = VALUES(updated_at)
    `, [
      id || crypto.randomUUID(),
      movieId,
      visitorId,
      normalizedScore,
      created,
      updated
    ]);
  }

  async addComment({ id, movieId, visitorId, author, body, createdAt }) {
    await this.ready;
    await this.pool.query(`
      INSERT IGNORE INTO comments (id, movie_id, visitor_id, author, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id || crypto.randomUUID(),
      movieId,
      visitorId,
      author.trim().slice(0, 24) || '匿名用户',
      body.trim().slice(0, 800),
      createdAt ? new Date(createdAt) : new Date()
    ]);
  }

  async syncStatus() {
    await this.ready;
    const [rows] = await this.pool.query(`
      SELECT last_run_at, last_success_at, last_error
      FROM sync_status
      WHERE id = 1
      LIMIT 1
    `);

    const status = rows[0] || {};

    return {
      lastRunAt: toISOString(status.last_run_at),
      lastSuccessAt: toISOString(status.last_success_at),
      lastError: status.last_error || null
    };
  }

  mapMovieRow(row) {
    const averageScore = Number(Number(row.average_score || 0).toFixed(1));

    return {
      id: row.id,
      title: row.title,
      doubanScore: Number(row.douban_score || 0),
      doubanVotes: Number(row.douban_votes || 0),
      releaseDate: row.release_date,
      duration: row.duration,
      region: row.region,
      genre: row.genre,
      directors: parseJsonArray(row.directors),
      casts: parseJsonArray(row.casts),
      poster: row.poster,
      doubanUrl: row.douban_url,
      isShowing: Boolean(row.is_showing),
      sourceUpdatedAt: toISOString(row.source_updated_at),
      ratingCount: Number(row.rating_count || 0),
      averageScore,
      updatedScore: Number(averageScore.toFixed(4))
    };
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toISOString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
