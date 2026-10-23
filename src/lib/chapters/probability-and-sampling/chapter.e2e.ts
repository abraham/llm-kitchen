import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('temperature 0 puts everything on the top word', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Temperature and top-k' });
	await widget.getByRole('slider', { name: /Temperature/ }).press('Home');
	await expect(widget.getByText('Temperature 0: always pick the most likely word.')).toBeVisible();
	await expect(widget.getByRole('table')).toContainText('100%');
	await widget.getByRole('button', { name: 'Sample 20 times' }).click();
	await expect(widget.getByText('20 samples')).toBeVisible();
	await expect(widget.locator('.tally li')).toHaveCount(1);

	await expect(page.getByText(/Temperature 1\.5/)).toBeVisible();
});

test('dividing scores by a small temperature widens the gap', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Divide by the temperature' });
	const readout = widget.locator('.readout');
	await expect(readout).toContainText('1.17×');
	await widget.getByRole('slider', { name: /Temperature/ }).press('Home');
	await expect(widget.getByRole('columnheader', { name: '÷ 0.10' })).toBeVisible();
	await expect(readout).toContainText('Divided by 0.10');
});
