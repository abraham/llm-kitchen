import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../e2e/helpers.ts';

/** One representative widget per Part, plus the menu. */
const SHOTS: { path: string; widget?: number }[] = [
	{ path: '/' },
	{ path: '/guessing-game', widget: 0 },
	{ path: '/embeddings', widget: 1 },
	{ path: '/learning-from-mistakes', widget: 1 },
	{ path: '/attention', widget: 1 },
	{ path: '/generating-text', widget: 0 },
	{ path: '/the-agent-loop', widget: 0 }
];

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(colorScheme, () => {
		test.use({ colorScheme });
		for (const { path, widget } of SHOTS) {
			test(path, async ({ page }) => {
				await gotoHydrated(page, path);
				await expect(page.getByText(/Loading/)).toHaveCount(0);
				await page.evaluate(() => document.fonts.ready);
				const name = `${path.slice(1) || 'menu'}-${colorScheme}.png`;
				if (widget === undefined) {
					await expect(page).toHaveScreenshot(name);
				} else {
					await expect(page.locator('section.widget').nth(widget)).toHaveScreenshot(name);
				}
			});
		}
	});
}

test.describe('phone', () => {
	test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
	test('/generating-text', async ({ page }) => {
		await gotoHydrated(page, '/generating-text');
		await page.evaluate(() => document.fonts.ready);
		await expect(page.locator('section.widget').first()).toHaveScreenshot(
			'generating-text-phone.png'
		);
	});
});
