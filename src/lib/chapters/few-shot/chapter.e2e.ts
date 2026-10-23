import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('examples teach a made-up rule', async ({ page }) => {
	await gotoHydrated(page, '/few-shot');
	const widget = page.getByRole('region', { name: 'Learning from examples' });
	await expect(widget.getByRole('row', { name: /happy sad .* 96%/ })).toBeVisible();
	await widget.getByLabel('Made-up labels').check();
	await widget.getByLabel('0', { exact: true }).check();
	await expect(widget.locator('pre')).toHaveText(/^pear -> ___$/);

	const head = page.getByRole('region', { name: 'Where the arrow looks' });
	await expect(head.getByText(/attention head 5\.0/)).toBeVisible();
});
