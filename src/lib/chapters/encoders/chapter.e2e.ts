import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('BERT reads both sides of the blank; GPT-2 only the left', async ({ page }) => {
	await gotoHydrated(page, '/encoders');
	const fill = page.getByRole('region', { name: 'Fill in the blank' });
	await expect(fill.getByRole('rowheader', { name: 'top' })).toBeVisible();
	await fill.getByLabel('Sentence').selectOption({ index: 1 });
	await expect(fill.getByRole('rowheader', { name: 'market' })).toBeVisible();

	const mask = page.getByRole('region', { name: 'Who can look at whom' });
	await expect(mask.getByText(/can look at 6 of 10 tokens/)).toBeVisible();
	await mask.getByLabel(/BERT \(encoder\)/).check();
	await expect(mask.getByText(/can look at 10 of 10 tokens/)).toBeVisible();
});
