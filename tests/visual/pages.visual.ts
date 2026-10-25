import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../e2e/helpers.ts';

/** One representative widget per Part, plus the menu and the downloads page. */
const SHOTS: { path: string; widget?: number }[] = [
	{ path: '/' },
	{ path: '/guessing-game', widget: 0 },
	{ path: '/embeddings', widget: 1 },
	{ path: '/learning-from-mistakes', widget: 1 },
	{ path: '/attention', widget: 1 },
	{ path: '/generating-text', widget: 0 },
	{ path: '/the-agent-loop', widget: 0 },
	{ path: '/downloads' }
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

/** Windows High Contrast and similar replace every color, so check figures and focus stay visible. */
test.describe('forced colors', () => {
	test.use({ forcedColors: 'active' });
	for (const path of ['/', '/downloads']) {
		test(path, async ({ page }) => {
			await gotoHydrated(page, path);
			await page.keyboard.press('Tab');
			await page.evaluate(() => document.fonts.ready);
			await expect(page).toHaveScreenshot(`${path.slice(1) || 'menu'}-forced-colors.png`);
		});
	}
	for (const slug of ['attention', 'scale', 'embeddings']) {
		test(`/${slug}`, async ({ page }) => {
			await gotoHydrated(page, `/${slug}`);
			await expect(page.getByText(/Loading/)).toHaveCount(0);
			await page.evaluate(() => document.fonts.ready);
			const widget = page
				.locator('section.widget')
				.filter({ has: page.locator('svg') })
				.first();
			await widget.getByRole('button', { name: 'Reset' }).focus();
			await expect(widget).toHaveScreenshot(`figure-${slug}-forced-colors.png`);
		});
	}
});

/** Chapters with SVG figures: every such widget, on a desktop and a phone. Some figures show
 * only after picking an option, named here. */
const FIGURE_PAGES: [slug: string, show?: string][] = [
	['guessing-game'],
	['probability-and-sampling'],
	['embeddings'],
	['a-neuron'],
	['learning-from-mistakes'],
	['attention'],
	['the-transformer-block'],
	['scale'],
	['quantization'],
	['where-prompts-break', 'Position in a long prompt'],
	['managing-the-context', 'Retrieve what’s relevant'],
	['designing-agents'],
	['caching'],
	['routing'],
	['splitting-the-work'],
	['encoders'],
	['recurrent-models'],
	['diffusion'],
	['decision-models']
];

for (const [device, use] of [
	['desktop', {}],
	['phone', { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }]
] as const) {
	test.describe(`figures on a ${device}`, () => {
		test.use(use);
		for (const [slug, show] of FIGURE_PAGES) {
			test(`/${slug}`, async ({ page }) => {
				await gotoHydrated(page, `/${slug}`);
				await expect(page.getByText(/Loading/)).toHaveCount(0);
				if (show) await page.getByRole('radio', { name: show }).check();
				await page.evaluate(() => document.fonts.ready);
				// A figure taller than the screen scrolls under the fixed app bar.
				await page.addStyleTag({ content: '.app-bar { visibility: hidden; }' });
				const widgets = page.locator('section.widget').filter({ has: page.locator('svg') });
				const count = await widgets.count();
				expect(count).toBeGreaterThan(0);
				for (let i = 0; i < count; i++) {
					// TinyTrainer starts from random weights, so its first sample and loss vary.
					if (await widgets.nth(i).locator('.samples').count()) {
						await widgets
							.nth(i)
							.locator('.samples .text, .readout')
							.evaluateAll((els) => els.forEach((el) => (el.textContent = 'varies')));
					}
					await expect(widgets.nth(i)).toHaveScreenshot(`figure-${slug}-${i}-${device}.png`);
				}
			});
		}
	});
}
