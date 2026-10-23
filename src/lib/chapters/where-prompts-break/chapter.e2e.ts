import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('order, layout, and position', async ({ page }) => {
	await gotoHydrated(page, '/where-prompts-break');
	const widget = page.getByRole('region', { name: 'Small changes, different answers' });
	await expect(widget.getByRole('row', { name: /8 of 8/ })).toBeVisible();
	await widget.getByLabel('Formatting').check();
	await expect(widget.getByRole('row', { name: /Sentiment.*7 of 8/ })).toBeVisible();
	await widget.getByLabel('Position in a long prompt').check();
	await expect(widget.getByText(/8 of 88 answers went wrong/)).toBeVisible();
});
