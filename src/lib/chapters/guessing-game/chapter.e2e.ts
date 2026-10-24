import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('a guess is compared with the recorded model', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	await page.getByLabel('The cat sat on the …').fill('floor');
	await page.getByRole('button', { name: /Compare with GPT-2 small/ }).click();
	await expect(page.getByText(/its number 1 guess/)).toBeVisible();

	await page.getByLabel('The cat sat on the …').fill('zebra');
	await page.getByRole('button', { name: /Compare/ }).click();
	await expect(page.getByText(/isn't in GPT-2 small's top 50/)).toBeVisible();
});

test('citations are numbered and link to the sources list', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	// The chapter has other levels, so each citation has a link per level; one shows.
	const first = page.locator('sup.cite a:visible').first();
	await expect(first).toHaveText('[1]');
	await first.click();
	await expect(page.locator('#source-shannon1951')).toBeInViewport();
});
