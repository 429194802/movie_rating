import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const initialData = {
  movies: [],
  ratings: [],
  comments: [],
  sync: {
    lastRunAt: null,
    lastSuccessAt: null,
    lastError: null
  }
};

export class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await readFile(this.filePath, 'utf8');
    } catch {
      await this.save(initialData);
    }
  }

  async read() {
    await this.init();
    const raw = await readFile(this.filePath, 'utf8');
    return { ...initialData, ...JSON.parse(raw) };
  }

  async save(data) {
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    });
    return this.writeQueue;
  }

  async update(mutator) {
    const data = await this.read();
    const next = await mutator(data);
    await this.save(next ?? data);
    return next ?? data;
  }

  async upsertMovies(incomingMovies) {
    return this.update((data) => {
      const existing = new Map(data.movies.map((movie) => [movie.id, movie]));
      const now = new Date().toISOString();

      for (const movie of incomingMovies) {
        existing.set(movie.id, {
          ...existing.get(movie.id),
          ...movie,
          isShowing: true,
          sourceUpdatedAt: now
        });
      }

      const incomingIds = new Set(incomingMovies.map((movie) => movie.id));
      data.movies = Array.from(existing.values()).map((movie) => ({
        ...movie,
        isShowing: incomingIds.has(movie.id)
      }));
      data.sync.lastRunAt = now;
      data.sync.lastSuccessAt = now;
      data.sync.lastError = null;
      return data;
    });
  }

  async recordSyncFailure(error) {
    return this.update((data) => {
      data.sync.lastRunAt = new Date().toISOString();
      data.sync.lastError = error.message;
      return data;
    });
  }

  async listMovies() {
    const data = await this.read();
    return data.movies
      .filter((movie) => movie.isShowing)
      .map((movie) => ({ ...movie, ...this.ratingSummary(data, movie.id) }))
      .sort((a, b) => Number(b.isShowing) - Number(a.isShowing) || b.updatedScore - a.updatedScore);
  }

  async getMovie(id) {
    const data = await this.read();
    const movie = data.movies.find((item) => item.id === id);
    if (!movie) return null;

    return {
      ...movie,
      ...this.ratingSummary(data, id),
      comments: data.comments
        .filter((comment) => comment.movieId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    };
  }

  async addRating({ movieId, visitorId, score }) {
    return this.update((data) => {
      const normalizedScore = Math.max(1, Math.min(10, Number(score)));
      const existing = data.ratings.find((rating) => rating.movieId === movieId && rating.visitorId === visitorId);

      if (existing) {
        existing.score = normalizedScore;
        existing.updatedAt = new Date().toISOString();
      } else {
        data.ratings.push({
          id: crypto.randomUUID(),
          movieId,
          visitorId,
          score: normalizedScore,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      return data;
    });
  }

  async addComment({ movieId, visitorId, author, body }) {
    return this.update((data) => {
      data.comments.push({
        id: crypto.randomUUID(),
        movieId,
        visitorId,
        author: author.trim().slice(0, 24) || '匿名用户',
        body: body.trim().slice(0, 800),
        createdAt: new Date().toISOString()
      });
      return data;
    });
  }

  async syncStatus() {
    const data = await this.read();
    return data.sync;
  }

  ratingSummary(data, movieId) {
    const ratings = data.ratings.filter((rating) => rating.movieId === movieId);
    const ratingCount = ratings.length;
    const average = ratingCount
      ? ratings.reduce((total, rating) => total + Number(rating.score), 0) / ratingCount
      : 0;

    return {
      ratingCount,
      averageScore: Number(average.toFixed(1)),
      updatedScore: Number(average.toFixed(4))
    };
  }
}
