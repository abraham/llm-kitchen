import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import { gotoHydrated } from './helpers.ts';

/** Every page on the site: the menu, all chapters, and the downloads page. */
const PAGES = ['/', ...CURRICULUM.map((c) => `/${c.slug}`), '/downloads'];

/** Chapters whose chapter.ts lists levels: they're checked at every level, not just Standard. */
const LEVELED_PAGES = readdirSync('src/lib/chapters')
	.filter((slug) => {
		const config = `src/lib/chapters/${slug}/chapter.ts`;
		return existsSync(config) && /export const levels\b/.test(readFileSync(config, 'utf8'));
	})
	.map((slug) => `/${slug}`);

/** Pages whose widgets run the GPT-2 tokenizer in the page (tier T1). */
const TOKENIZER_PAGES = new Set(['/tokens', '/quirks-and-limits']);
const BUDGET_KB = 150;
const TOKENIZER_BUDGET_KB = 350;

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });
		for (const path of PAGES) {
			test(`${path} loads its widgets and has no axe violations`, async ({ page, baseURL }) => {
				// Models download only after consent, so nothing on a page may fetch from another origin.
				const offSite: string[] = [];
				page.on('request', (r) => {
					if (!/^(data|blob):/.test(r.url()) && !r.url().startsWith(baseURL!))
						offSite.push(r.url());
				});
				await gotoHydrated(page, path);
				await expect(page.getByText(/Loading/)).toHaveCount(0);
				const results = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
				expect(offSite).toEqual([]);
			});
		}
	});
}

test.describe('explanation levels', () => {
	test('some chapters have other levels to check', () => {
		expect(LEVELED_PAGES.length).toBeGreaterThan(0);
	});

	for (const path of LEVELED_PAGES) {
		for (const level of ['simple', 'deep']) {
			test(`${path} at ${level} has no axe violations and doesn't scroll sideways on a phone`, async ({
				page
			}) => {
				await page.addInitScript((l) => localStorage.setItem('llm-kitchen:level', l), level);
				await gotoHydrated(page, path);
				await expect(page.locator('html')).toHaveAttribute('data-level', level);
				await expect(page.getByText(/Loading/)).toHaveCount(0);
				const results = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

				await page.setViewportSize({ width: 375, height: 740 });
				const overflow = await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth
				);
				expect(overflow).toBeLessThanOrEqual(0);
			});
		}
	}
});

test.describe('prerendered HTML', () => {
	for (const path of PAGES) {
		test(`${path} shows its recorded data before JavaScript runs`, async ({ request }) => {
			const html = await (await request.get(path)).text();
			expect(html).not.toContain('Loading recorded data');
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
