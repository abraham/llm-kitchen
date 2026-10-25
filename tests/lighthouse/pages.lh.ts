import { expect, test } from '@playwright/test';
import lighthouse, { type RunnerResult } from 'lighthouse';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import { DEBUG_PORT } from '../../playwright.lighthouse.config.ts';

/** Every page on the site: the menu and all chapters. None loads a live model without consent. */
const PAGES = ['/', ...CURRICULUM.map((c) => `/${c.slug}`), '/downloads'];
const MIN_SCORE = 95;
/** Runs per page at most. Like Lighthouse CI's default, a page passes on its best run. */
const MAX_RUNS = 3;

const score = (result: RunnerResult, category: 'performance' | 'accessibility') =>
	Math.round((result.lhr.categories[category]?.score ?? 0) * 100);

for (const path of PAGES) {
	// The browser fixture starts the shared Chromium that Lighthouse drives through DEBUG_PORT.
	test(`${path} scores at least ${MIN_SCORE} for performance and accessibility`, async ({
		browser,
		baseURL
	}, testInfo) => {
		expect(browser.isConnected()).toBe(true);
		let best: RunnerResult | undefined;
		// Scores vary between runs on shared CI machines, and a run can fail to record its trace
		// (a runtime error with no scores), so a page gets a few tries before it fails.
		for (let run = 0; run < MAX_RUNS; run++) {
			const result = await lighthouse(new URL(path, baseURL).href, {
				port: DEBUG_PORT,
				output: 'html',
				logLevel: 'error',
				onlyCategories: ['performance', 'accessibility']
			});
			if (!result) continue;
			if (!best || score(result, 'performance') > score(best, 'performance')) best = result;
			if (!result.lhr.runtimeError && score(result, 'performance') >= MIN_SCORE) break;
		}
		expect(best, 'a Lighthouse result').toBeDefined();
		const scores = {
			performance: score(best!, 'performance'),
			accessibility: score(best!, 'accessibility')
		};
		if (scores.performance < MIN_SCORE || scores.accessibility < MIN_SCORE) {
			await testInfo.attach('lighthouse.html', {
				body: best!.report as string,
				contentType: 'text/html'
			});
		}
		expect.soft(best!.lhr.runtimeError?.code, 'runtime error').toBeUndefined();
		expect.soft(scores.performance, 'performance').toBeGreaterThanOrEqual(MIN_SCORE);
		expect.soft(scores.accessibility, 'accessibility').toBeGreaterThanOrEqual(MIN_SCORE);
	});
}
