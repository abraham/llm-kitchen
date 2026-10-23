import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CURRICULUM, chapterFileName } from '../../src/lib/chapters/meta.ts';
import { gotoHydrated } from './helpers.ts';

/** Every page on the site: the menu and all written chapters. */
const PAGES = [
	'/',
	...CURRICULUM.filter((c) => existsSync(`src/lib/chapters/${chapterFileName(c)}`)).map(
		(c) => `/${c.slug}`
	)
];

/** Pages whose widgets run the GPT-2 tokenizer in the page (tier T1). */
const TOKENIZER_PAGES = new Set(['/tokens', '/quirks-and-limits']);
const BUDGET_KB = 150;
const TOKENIZER_BUDGET_KB = 350;

test.describe('dark theme', () => {
	test.use({ colorScheme: 'dark' });
	for (const path of PAGES) {
		test(`${path} has no axe violations`, async ({ page }) => {
			await gotoHydrated(page, path);
			await expect(page.getByText(/Loading/)).toHaveCount(0);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
		});
	}
});

test.describe('phone-sized screen', () => {
	test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
	for (const path of PAGES) {
		test(`${path} doesn't scroll sideways`, async ({ page }) => {
			await gotoHydrated(page, path);
			await expect(page.getByText(/Loading/)).toHaveCount(0);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
});

test.describe('JavaScript budget', () => {
	for (const path of PAGES) {
		test(`${path} loads less than its budget`, async ({ page }) => {
			const sizes: Promise<number>[] = [];
			page.on('response', (r) => {
				if (r.request().resourceType() === 'script') {
					sizes.push(
						r.body().then(
							(b) => gzipSync(b).length,
							() => 0
						)
					);
				}
			});
			await gotoHydrated(page, path);
			await page.waitForLoadState('networkidle');
			const kb = (await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024;
			const budget = TOKENIZER_PAGES.has(path) ? TOKENIZER_BUDGET_KB : BUDGET_KB;
			expect(kb, `${kb.toFixed(0)} KB of gzipped JavaScript`).toBeLessThan(budget);
		});
	}
});
