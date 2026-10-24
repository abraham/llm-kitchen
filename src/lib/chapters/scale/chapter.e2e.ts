import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('switching the scale metric shows unpublished numbers', async ({ page }) => {
	await gotoHydrated(page, '/scale');
	const widget = page.getByRole('region', { name: 'How big is big?' });
	await expect(widget.getByRole('row', { name: /GPT-3.*175 billion/ })).toBeVisible();
	await widget.getByLabel('Compute').check();
	await expect(widget.getByRole('row', { name: /GPT-2 small.*not published/ })).toBeVisible();

	const chart = page.getByRole('region', { name: 'The scaling curve' });
	await chart.getByLabel(/Weights:/).fill('11');
	await expect(chart.getByRole('status')).toContainText('outside the range');
});
