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

test('byte diff inspector compares examples and annotates selected bytes', async ({ page }) => {
	await gotoHydrated(page, '/text-is-numbers');
	const inspector = page.getByRole('region', { name: 'Inspect the bytes' });
	await expect(inspector.getByRole('status')).toContainText('Added at offset 0x04: F0 (240)');

	await inspector.getByRole('button', { name: 'cafe → café' }).click();
	await expect(inspector.getByText('4 → 5 bytes')).toBeVisible();
	await expect(inspector.getByRole('status')).toContainText('lead byte 1 of 2 for “é”');

	await inspector.getByRole('button', { name: /A9, added/ }).click();
	await expect(inspector.getByRole('status')).toContainText('continuation byte 2 of 2 for “é”');
	await expect(inspector.getByRole('status')).toContainText('Starts with 10');
});
