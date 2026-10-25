import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('words and meaning find different exchanges', async ({ page }) => {
	await gotoHydrated(page, '/search-and-memory');
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

test('notes carry what was written, right or wrong, into a new chat', async ({ page }) => {
	await gotoHydrated(page, '/search-and-memory');
	const widget = page.getByRole('region', { name: 'Notes for next time' });
	await expect(widget.getByText(/✓ Right/)).toHaveCount(0);
	await expect(widget.getByRole('region', { name: 'The notes' })).toContainText('astronomy');

	await widget.getByLabel('Notes from a specific request').check();
	await expect(widget.getByText(/✓ Right/)).toHaveCount(2);
	await expect(widget.getByText('Sam loves the rhyme "Twinkle, twinkle')).toBeVisible();

	await widget.getByLabel('No notes').check();
	await expect(widget.getByRole('region', { name: 'The notes' })).toHaveCount(0);
});
