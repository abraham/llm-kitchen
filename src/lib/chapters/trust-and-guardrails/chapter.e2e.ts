import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('guardrails protect the files', async ({ page }) => {
	await gotoHydrated(page, '/trust-and-guardrails');
	const widget = page.getByRole('region', { name: 'A poisoned web page' });
	await expect(widget.getByText('taxes.pdf (deleted)')).toBeVisible();
	await widget.getByLabel('Ask before deleting').check();
	await expect(widget.getByText('taxes.pdf (deleted)')).toHaveCount(0);
	await expect(widget.getByText('blocked by the harness').first()).toBeVisible();
});
