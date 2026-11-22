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
	await expect(view.getByRole('status')).toContainText('Your question · Your question');

	await view.getByLabel('Edit the system prompt before turn 4').check();
	await expect(view.getByRole('status')).toContainText('Turn 4 · System prompt');
	await expect(view.getByRole('status')).toContainText('broke the cache');
	await view.getByRole('button', { name: /Turn 4, Turn 1, .*Recomputed/ }).click();
	await expect(view.getByRole('status')).toContainText('unchanged from Turn 3');

	await view.getByLabel('Put the time at the top').check();
	await expect(view.getByText('0 (0%)')).toBeVisible();
});
