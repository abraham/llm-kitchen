import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('counting builds the table, then the model generates', async ({ page }) => {
	await gotoHydrated(page, '/predicting-by-counting');
	const widget = page.getByRole('region', { name: 'Build a bigram model' });
	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(widget.getByText('just counted mary → had')).toBeVisible();
	await widget.getByRole('button', { name: 'Count everything' }).click();
	await widget.getByLabel('After the word').selectOption('little');
	await expect(widget.getByRole('table')).toContainText('33%');
	await widget.getByRole('button', { name: 'Generate' }).click();
	await expect(widget.locator('.generated')).not.toBeEmpty();
});
