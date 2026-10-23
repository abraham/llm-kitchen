import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/guessing-game'];

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });

		for (const path of pages) {
			test(`${path} has no axe violations`, async ({ page }) => {
				await page.goto(path);
				const results = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
			});
		}
	});
}

test('the chapter shell renders its parts', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect(page.getByRole('complementary', { name: 'Ingredients' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Guess the next word' })).toBeVisible();
	await expect(page.getByText('Recorded', { exact: true })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Recap' })).toBeVisible();
});

test('glossary terms open a definition and close with Escape', async ({ page }) => {
	await page.goto('/guessing-game');
	const trigger = page.getByRole('button', { name: 'large language model' });
	await trigger.click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('note')).toContainText('predict the next piece of text');
	await page.keyboard.press('Escape');
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('note')).toBeHidden();
});

test('visited chapters are remembered', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('llm-kitchen:visited')))
		.toContain('guessing-game');
});
