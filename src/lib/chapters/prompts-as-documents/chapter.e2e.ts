import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('setting the scene changes the next word', async ({ page }) => {
	await gotoHydrated(page, '/prompts-as-documents');
	const widget = page.getByRole('region', { name: 'Change the start of the document' });
	await widget.getByLabel(/It was bedtime/).check();
	await expect(widget.getByRole('row', { name: /bed.*22%/ }).first()).toBeVisible();
	await widget.getByLabel('Frame a question').check();
	await expect(widget.getByRole('table', { name: /Chance of “Paris” next/ })).toBeVisible();
});
