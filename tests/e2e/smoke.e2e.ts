import { expect, test } from '@playwright/test';

test('landing page lists the written chapters', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('LLM Kitchen');
	await expect(page.getByRole('link', { name: /The guessing game/ })).toBeVisible();
});

test('a chapter page renders its prerendered content', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('The guessing game');
	// The prose line, not the widget's fan, which shows the same text once its trace loads.
	await expect(page.locator('em', { hasText: 'The cat sat on the ___' })).toBeVisible();
});

test('an unknown chapter is a 404', async ({ page }) => {
	const response = await page.goto('/not-a-chapter');
	expect(response?.status()).toBe(404);
});
