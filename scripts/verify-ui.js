import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const movieCount = await page.locator('.movie-card').count();
if (!movieCount) throw new Error('No movie cards found on homepage.');
await page.screenshot({ path: 'screenshots/home.png', fullPage: true });

await page.locator('.movie-card h2 a').first().click();
await page.waitForLoadState('domcontentloaded');
await page.fill('#score', '8');
await page.click('form[action$="/rating"] button');
await page.waitForLoadState('domcontentloaded');
await page.fill('#author', 'QA user');
await page.fill('#body', 'Local acceptance comment: rating and comment flow works.');
await page.click('form[action$="/comments"] button');
await page.waitForLoadState('domcontentloaded');
await page.screenshot({ path: 'screenshots/detail.png', fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 900 }, isMobile: true });
await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: 'screenshots/mobile-home.png', fullPage: false });

await browser.close();
console.log(`Verified ${baseUrl} with ${movieCount} movies.`);
