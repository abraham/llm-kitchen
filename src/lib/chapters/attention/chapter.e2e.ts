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

test('one head, step by step, and paging through all 144', async ({ page }) => {
	await gotoHydrated(page, '/attention');
	const grid = page.getByRole('region', { name: 'One head, step by step' });
	await expect(grid.getByRole('img', { name: /Head 9\.9, scores/ })).toBeVisible();
	await expect(grid.getByRole('status')).toContainText('·Mary');
	await expect(grid.getByText('118 of 144')).toBeVisible();

	await grid.getByLabel('Masked').check();
	await expect(grid.getByRole('img', { name: /Head 9\.9, masked/ })).toBeVisible();
	await expect(grid.getByText('−∞').first()).toBeVisible();

	await grid.getByRole('button', { name: 'Next head' }).click();
	await expect(grid.getByText('119 of 144')).toBeVisible();
	await expect(grid.getByRole('status')).toContainText('Head 9.10');
	await grid.getByLabel('Layer', { exact: true }).selectOption('11');
	await grid.getByLabel('Head', { exact: true }).selectOption('11');
	await grid.getByRole('button', { name: 'Next head' }).click();
	await expect(grid.getByText('1 of 144')).toBeVisible();
});
