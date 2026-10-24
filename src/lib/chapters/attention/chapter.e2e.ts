import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('attention steps and the GPT-2 viewer', async ({ page }) => {
	await gotoHydrated(page, '/attention');
	const qkv = page.getByRole('region', { name: 'Queries, keys, and values' });
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await expect(qkv.getByRole('table')).toContainText('—');
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await expect(qkv.getByText('new “it”')).toBeVisible();

	const viewer = page.getByRole('region', { name: 'Who looks at whom' });
	const readout = viewer.getByRole('status');
	await expect(readout).toContainText('Layer 9, head 9');
	await expect(readout).toContainText('Mary');
	await viewer.getByLabel('Sentence').selectOption('attn-mary-lamb');
	await expect(readout).toContainText('Layer 9, head 0');
	await expect(readout).toContainText('lamb');
	await viewer.getByRole('button', { name: '·lamb' }).click();
	await expect(readout).toContainText('“·lamb” looks most at');
});
