import * as cheerio from 'cheerio';

const DOUBAN_BASE = 'https://movie.douban.com';

export async function fetchNowPlaying(city = 'beijing') {
  const url = `${DOUBAN_BASE}/cinema/nowplaying/${encodeURIComponent(city)}/`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MovieRatingBot/1.0; +https://example.com)',
      Accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Douban request failed with HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseNowPlaying(html);
}

export function parseNowPlaying(html) {
  const $ = cheerio.load(html);
  const movies = [];
  const items = $('#nowplaying .list-item').length ? $('#nowplaying .list-item') : $('.list-item');

  items.each((_, element) => {
    const item = $(element);
    const id = clean(item.attr('data-subject')) || clean(item.attr('data-id'));
    const title = clean(item.attr('data-title')) || clean(item.find('.stitle a').text());
    if (!id || !title) return;

    movies.push({
      id,
      title,
      doubanScore: normalizeScore(item.attr('data-score')),
      doubanVotes: normalizeNumber(item.attr('data-votecount')),
      releaseDate: clean(item.attr('data-release')),
      duration: clean(item.attr('data-duration')),
      region: clean(item.attr('data-region')),
      genre: normalizeGenre(item.attr('data-category')),
      directors: splitPeople(item.attr('data-director')),
      casts: splitPeople(item.attr('data-actors')),
      poster: normalizePoster(item.find('img').attr('src')),
      doubanUrl: `${DOUBAN_BASE}/subject/${id}/`
    });
  });

  return dedupeMovies(movies);
}

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function splitPeople(value = '') {
  return clean(value)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : 0;
}

function normalizeNumber(value) {
  const number = Number(String(value || '').replace(/[^\d]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function normalizePoster(value = '') {
  const poster = clean(value);
  if (!poster) return '';
  return poster.replace(/^http:\/\//, 'https://');
}

function normalizeGenre(value = '') {
  const genre = clean(value);
  return ['nowplaying', 'upcoming'].includes(genre) ? '' : genre;
}

function dedupeMovies(movies) {
  return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}
