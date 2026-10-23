import { expect, test } from '@playwright/test';

test('landing page lists the written chapters', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('llm-kitchen');
	await expect(page.getByRole('link', { name: /The guessing game/ })).toBeVisible();
});

test('a chapter page renders its prerendered content', async ({ page }) => {
	await page.goto('/guessing-game');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('The guessing game');
	await expect(page.getByText('The cat sat on the ___')).toBeVisible();
});

test('an unknown chapter is a 404', async ({ page }) => {
	const response = await page.goto('/not-a-chapter');
	expect(response?.status()).toBe(404);
});
