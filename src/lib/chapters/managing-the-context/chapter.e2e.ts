import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('strategies change what the model can answer', async ({ page }) => {
	await gotoHydrated(page, '/managing-the-context');
	const widget = page.getByRole('region', { name: 'The context budget' });
	await widget.getByLabel('Drop the oldest').check();
	await expect(widget.getByText(/Old Mother Hubbard/)).toBeVisible();
	await widget.getByLabel(/Retrieve/).check();
	await expect(widget.getByRole('img', { name: /task 1 is the closest/ })).toBeVisible();
	await expect(widget.locator('.answer')).toContainText('30 words');
});
