import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const pages = ['/', '/guessing-game'];

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });

		for (const path of pages) {
			test(`${path} has no axe violations`, async ({ page }) => {
				await gotoHydrated(page, path);
				const results = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
			});
		}
	});
}

test('the chapter shell renders its parts', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	await expect(page.getByRole('complementary', { name: 'Ingredients' })).toBeVisible();
	const widget = page.locator('section.widget').first();
	await expect(widget).toBeVisible();
	await expect(widget.locator('.badge')).toBeVisible();
	await expect(page.getByRole('region', { name: 'Recap' })).toBeVisible();
});

test('glossary terms open a definition and close with Escape', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	const trigger = page.getByRole('button', { name: 'large language model' });
	await trigger.click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('note')).toContainText('predict the next piece of text');
	await page.keyboard.press('Escape');
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('note')).toBeHidden();
});

test('visited chapters are remembered', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('llm-kitchen:visited')))
		.toContain('guessing-game');
});

test('the side menu opens only the current part until another is clicked', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoHydrated(page, '/attention');
	const rail = page.locator('.rail-static');
	const openParts = rail.locator('details[open] > summary');
	await expect(openParts).toHaveText(['Part IV: Context']);
	await expect(rail.getByRole('link', { name: /Tools/ })).toBeHidden();

	await rail.getByText('Part VI: Harnesses').click();
	await rail.getByRole('link', { name: /Tools/ }).click();
	await expect(page).toHaveURL(/\/tools$/);
	await expect(openParts).toHaveText(['Part VI: Harnesses']);
});
