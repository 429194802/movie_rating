import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { getStore } from '../src/lib/store.js';

const filePath = process.argv[2] || process.env.DATA_FILE || './data/store.json';
const raw = await readFile(filePath, 'utf8');
const data = JSON.parse(raw);
const store = getStore();

if (Array.isArray(data.movies) && data.movies.length) {
  await store.upsertMovies(data.movies);
}

for (const rating of data.ratings || []) {
  await store.addRating({
    id: rating.id,
    movieId: rating.movieId,
    visitorId: rating.visitorId,
    score: rating.score,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt
  });
}

for (const comment of data.comments || []) {
  await store.addComment({
    id: comment.id,
    movieId: comment.movieId,
    visitorId: comment.visitorId,
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt
  });
}

console.log(`Migrated ${(data.movies || []).length} movies, ${(data.ratings || []).length} ratings, ${(data.comments || []).length} comments from ${filePath}.`);
process.exit(0);
