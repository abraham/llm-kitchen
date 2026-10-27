import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('a persona does not help with sums', async ({ page }) => {
	await gotoHydrated(page, '/instructions-and-roles');
	const widget = page.getByRole('region', { name: 'Same question, different system prompts' });
	await widget.getByLabel('A persona').check();
	await expect(widget.locator('.template [data-role="system"]')).toHaveText(
		'You are a world-famous physicist.'
	);
	await expect(widget.getByRole('row', { name: /Right 5 of 8 3 of 8/ })).toBeVisible();
});

test('many rules at once', async ({ page }) => {
	await gotoHydrated(page, '/instructions-and-roles');
	const widget = page.getByRole('region', { name: 'How many rules at once?' });
	await expect(widget.getByRole('listitem')).toHaveCount(10);
	await widget.getByLabel('1', { exact: true }).check();
	await expect(widget.getByRole('listitem')).toHaveCount(1);
	await expect(widget.getByText(/It kept [01] of 1\s+rule\./)).toBeVisible();
});
