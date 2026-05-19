# Repository Guidelines

## Project Structure & Module Organization
Application code lives in `src/`. Server routes are in `src/server.js`, data access is in `src/lib/store.js`, and Douban importing logic is in `src/lib/douban.js`. EJS templates are stored in `src/views/`, public styles and scripts in `public/`, utility scripts in `scripts/`, and persistent runtime data in `data/`.

## Build, Test, and Development Commands
Run `npm install` once before development. Use `npm run dev` to start the local server with file watching, `npm start` for production mode, `npm run sync` to manually import current Douban movies, and `npm run check` for JavaScript syntax checks.

## Coding Style & Naming Conventions
Use modern ES modules, 2-space indentation for JavaScript, and clear camelCase names for variables and functions. Keep route handlers thin; move parsing, persistence, or formatting logic into `src/lib/`. Name templates by page purpose, for example `movie.ejs` or `index.ejs`.

## Testing Guidelines
There is no full automated test suite yet. Before opening a pull request, run `npm run check`, start the server, and verify the homepage, movie detail page, rating form, comment form, and manual sync endpoint. Add regression tests when changing shared parsing or persistence behavior.

## Commit & Pull Request Guidelines
Use concise imperative commits such as `Add Douban importer` or `Improve rating form validation`. Pull requests should include a short summary, manual test notes, screenshots for UI changes, and any relevant deployment or configuration changes.

## Security & Configuration Tips
Keep secrets in `.env`, never in source control. Set a strong `ADMIN_SYNC_TOKEN` in production. The scraper should remain respectful: cache results, use the scheduled sync interval, and avoid high-frequency requests.
