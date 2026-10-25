import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('strategies change what the model can answer', async ({ page }) => {
	await gotoHydrated(page, '/managing-the-context');
	const widget = page.getByRole('region', { name: 'The context budget' });
	await widget.getByLabel('Drop the oldest').check();
	await expect(widget.locator('.answer')).toContainText("don't have information");
	await widget.getByLabel(/Retrieve/).check();
	await expect(widget.getByRole('img', { name: /exchange 1 is the closest/ })).toBeVisible();
	await expect(widget.locator('.answer')).toContainText('Lily');
});

test('words and meaning find different exchanges', async ({ page }) => {
	await gotoHydrated(page, '/managing-the-context');
	const widget = page.getByRole('region', { name: 'Search by words or by meaning' });
	const status = widget.getByRole('status');
	await expect(status).toContainText('By words: Lily');

	await widget.getByLabel('Question').selectOption({ label: 'Which one is about a kitty?' });
	await expect(widget.getByText('No exchange has any of the question’s words.')).toBeVisible();
	await expect(status).toContainText('By meaning: Lily');

	await widget.getByLabel('Question').selectOption({ label: 'What did I tell you about Sam?' });
	await expect(status).toContainText('By words: Sam: Humpty Dumpty sat on a wall');
	await expect(status).toContainText('Combined: Sam');
});
