import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { nanoid } from 'nanoid';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNowPlaying } from './lib/douban.js';
import { Store } from './lib/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const siteName = process.env.SITE_NAME || '新片评分';
const dataFile = path.resolve(process.env.DATA_FILE || './data/store.json');
const city = process.env.DOUBAN_CITY || 'beijing';
const syncCron = process.env.SYNC_CRON || '0 */6 * * *';
const adminToken = process.env.ADMIN_SYNC_TOKEN || '';
const store = new Store(dataFile);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

app.use((request, response, next) => {
  if (!request.cookies.visitorId) {
    response.cookie('visitorId', nanoid(16), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }
  response.locals.siteName = siteName;
  next();
});

app.get('/', async (_request, response, next) => {
  try {
    const [movies, sync] = await Promise.all([store.listMovies(), store.syncStatus()]);
    response.render('index', { movies, sync });
  } catch (error) {
    next(error);
  }
});

app.get('/movie/:id', async (request, response, next) => {
  try {
    const movie = await store.getMovie(request.params.id);
    if (!movie) return response.status(404).render('not-found');
    response.render('movie', { movie });
  } catch (error) {
    next(error);
  }
});

app.get('/poster', async (request, response, next) => {
  try {
    const imageUrl = String(request.query.url || '');
    if (!imageUrl.startsWith('https://img') || !imageUrl.includes('doubanio.com/')) {
      return response.status(400).send('Invalid poster URL');
    }

    const upstream = await fetch(imageUrl, {
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; MovieRatingBot/1.0)'
      }
    });

    if (!upstream.ok) return response.sendStatus(upstream.status);
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    next(error);
  }
});

app.post('/movie/:id/rating', async (request, response, next) => {
  try {
    const score = Number(request.body.score);
    if (!Number.isFinite(score) || score < 1 || score > 10) {
      return response.status(400).send('评分必须在 1 到 10 之间。');
    }

    await store.addRating({
      movieId: request.params.id,
      visitorId: request.cookies.visitorId,
      score
    });
    response.redirect(`/movie/${request.params.id}`);
  } catch (error) {
    next(error);
  }
});

app.post('/movie/:id/comments', async (request, response, next) => {
  try {
    const body = String(request.body.body || '').trim();
    if (body.length < 2) return response.status(400).send('评论至少需要 2 个字符。');

    await store.addComment({
      movieId: request.params.id,
      visitorId: request.cookies.visitorId,
      author: String(request.body.author || ''),
      body
    });
    response.redirect(`/movie/${request.params.id}#comments`);
  } catch (error) {
    next(error);
  }
});

app.get('/admin/sync', async (request, response, next) => {
  try {
    if (!adminToken || request.query.token !== adminToken) {
      return response.status(401).send('Unauthorized');
    }

    const count = await syncMovies();
    response.json({ imported: count });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).render('error', { error });
});

async function syncMovies() {
  const movies = await fetchNowPlaying(city);
  await store.upsertMovies(movies);
  return movies.length;
}

async function start() {
  await store.init();

  syncMovies().catch(async (error) => {
    await store.recordSyncFailure(error);
    console.error('Initial sync failed:', error.message);
  });

  if (cron.validate(syncCron)) {
    cron.schedule(syncCron, () => {
      syncMovies().catch(async (error) => {
        await store.recordSyncFailure(error);
        console.error('Scheduled sync failed:', error.message);
      });
    });
  }

  app.listen(port, () => {
    console.log(`${siteName} listening on http://localhost:${port}`);
  });
}

start();
