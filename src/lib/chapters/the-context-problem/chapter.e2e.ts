import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('widening the window brings the referents into view', async ({ page }) => {
	await gotoHydrated(page, '/the-context-problem');
	const widget = page.getByRole('region', { name: 'How far back can it see?' });
	await expect(widget.getByText('Misses “trophy”')).toBeVisible();
	await widget.getByRole('button', { name: 'whole sentence' }).click();
	await expect(widget.getByText('“it” is the trophy')).toBeVisible();
	await widget.getByLabel('too small').check();
	await expect(widget.getByText('“it” is the suitcase')).toBeVisible();
});
