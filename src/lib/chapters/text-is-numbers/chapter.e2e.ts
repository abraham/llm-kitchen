import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('é takes two bytes and 🐱 takes four', async ({ page }) => {
	await gotoHydrated(page, '/text-is-numbers');
	await page.getByLabel('Type anything').fill('é🐱');
	await page.getByLabel('UTF-8 bytes').check();
	await expect(page.getByText('2 characters, 6 bytes.')).toBeVisible();
	await expect(page.getByText('C3 A9')).toBeVisible();
	await expect(page.getByText('F0 9F 90 B1')).toBeVisible();
});
