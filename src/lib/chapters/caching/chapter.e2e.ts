import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the KV cache and the prompt cache', async ({ page }) => {
	await gotoHydrated(page, '/caching');
	const kv = page.getByRole('region', { name: 'Reusing keys and values' });
	for (let i = 0; i < 4; i++) await kv.getByRole('button', { name: 'Next →' }).click();
	await expect(kv.getByRole('status')).toContainText('run 35 token positions with the cache off');
	await kv.getByRole('radio', { name: 'On', exact: true }).check();
	await expect(kv.getByRole('status')).toContainText('run 9 token positions with the cache on');

	const view = page.getByRole('region', { name: 'What the provider can reuse' });
	await expect(view.getByText('2,342 (79%)')).toBeVisible();
	await view.getByLabel('Put the time at the top').check();
	await expect(view.getByText('0 (0%)')).toBeVisible();
});
