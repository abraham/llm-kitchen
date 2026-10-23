import type { Page } from '@playwright/test';

/** Navigate and wait until the app has hydrated, so typing and clicking reach the widgets. */
export async function gotoHydrated(page: Page, path: string) {
	await page.goto(path);
	await page.waitForSelector('html[data-hydrated]');
}
