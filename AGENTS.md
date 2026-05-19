# Repository Guidelines

## Project Structure & Module Organization
Application code lives in `src/`. Next.js App Router pages and route handlers are in `src/app/`, data access is in `src/lib/store.js`, shared sync logic is in `src/lib/sync.js`, and Douban importing logic is in `src/lib/douban.js`. Utility scripts are in `scripts/`, and persistent runtime data is in `data/`.

## Build, Test, and Development Commands
Run `npm install` once before development. Use `npm run dev` to start the local Next.js server, `npm run build` before production deployment, `npm start` for production mode through `next start`, `npm run sync` to manually import current Douban movies, and `npm run check` for JavaScript syntax checks.

## Coding Style & Naming Conventions
Use modern ES modules, 2-space indentation for JavaScript, and clear camelCase names for variables and functions. Keep route handlers thin; move parsing, persistence, or formatting logic into `src/lib/`. Name Next.js pages and route handlers according to the App Router conventions.

## Testing Guidelines
There is no full automated test suite yet. Before opening a pull request, run `npm run check`, start the server, and verify the homepage, movie detail page, rating form, comment form, and manual sync endpoint. Add regression tests when changing shared parsing or persistence behavior.

## Commit & Pull Request Guidelines
Use concise imperative commits such as `Add Douban importer` or `Improve rating form validation`. Pull requests should include a short summary, manual test notes, screenshots for UI changes, and any relevant deployment or configuration changes.

## Security & Configuration Tips
Keep secrets in `.env`, never in source control. Set a strong `ADMIN_SYNC_TOKEN` in production. The scraper should remain respectful: cache results, use the scheduled sync interval, and avoid high-frequency requests.
