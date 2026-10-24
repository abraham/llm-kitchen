import { expect, test } from '@playwright/test';
import lighthouse from 'lighthouse';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import { DEBUG_PORT } from '../../playwright.lighthouse.config.ts';

/** Every page on the site: the menu and all chapters. None loads a live model without consent. */
const PAGES = ['/', ...CURRICULUM.map((c) => `/${c.slug}`)];
const MIN_SCORE = 95;

for (const path of PAGES) {
	// The browser fixture starts the shared Chromium that Lighthouse drives through DEBUG_PORT.
	test(`${path} scores at least ${MIN_SCORE} for performance and accessibility`, async ({
		browser,
		baseURL
	}, testInfo) => {
		expect(browser.isConnected()).toBe(true);
		const result = await lighthouse(new URL(path, baseURL).href, {
			port: DEBUG_PORT,
			output: 'html',
			logLevel: 'error',
			onlyCategories: ['performance', 'accessibility']
		});
		const { categories } = result!.lhr;
		const scores = {
			performance: Math.round(categories.performance.score! * 100),
			accessibility: Math.round(categories.accessibility.score! * 100)
		};
		if (scores.performance < MIN_SCORE || scores.accessibility < MIN_SCORE) {
			await testInfo.attach('lighthouse.html', {
				body: result!.report as string,
				contentType: 'text/html'
			});
		}
		expect.soft(scores.performance, 'performance').toBeGreaterThanOrEqual(MIN_SCORE);
		expect.soft(scores.accessibility, 'accessibility').toBeGreaterThanOrEqual(MIN_SCORE);
	});
}
