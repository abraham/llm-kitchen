import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('patches and matching captions', async ({ page }) => {
	await gotoHydrated(page, '/seeing-pictures');
	const patches = page.getByRole('region', { name: 'Cut a picture into tokens' });
	await patches.getByRole('slider', { name: /Patch/ }).fill('0');
	await expect(patches.getByText(/looks exactly like \d+ others/)).toBeVisible();

	const match = page.getByRole('region', { name: 'Match words to pictures' });
	await match.getByLabel('Words').selectOption('a blue star');
	await expect(match.locator('li.best img')).toHaveAttribute('alt', 'A blue star');
});
