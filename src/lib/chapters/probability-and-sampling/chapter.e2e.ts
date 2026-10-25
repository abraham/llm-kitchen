import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('temperature 0 puts everything on the top word', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Temperature, top-k, and top-p' });
	await widget.getByRole('slider', { name: /Temperature/ }).press('Home');
	await expect(widget.getByText('Temperature 0: always pick the most likely word.')).toBeVisible();
	await expect(widget.getByRole('table')).toContainText('100%');
	await widget.getByRole('button', { name: 'Sample 20 times' }).click();
	await expect(widget.getByText('20 samples')).toBeVisible();
	await expect(widget.locator('.tally li')).toHaveCount(1);

	await expect(page.getByText(/Temperature 1\.5/)).toBeVisible();
});

test('top-p 0.5 keeps the words whose chances reach half', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Temperature, top-k, and top-p' });
	const slider = widget.getByRole('slider', { name: /Top-p/ });
	for (let i = 0; i < 10; i++) await slider.press('ArrowLeft');
	await expect(
		widget.getByText(
			'Top-p 0.50: only the most likely words, until their chances reach 50%, can be picked.'
		)
	).toBeVisible();
	await widget.getByRole('button', { name: 'Sample 20 times' }).click();
	const picked = await widget.locator('.tally li .mono').allTextContents();
	expect(picked.length).toBeGreaterThan(0);
	for (const word of picked)
		expect(['floor', 'bed', 'couch', 'ground']).toContain(word.trim().replace('·', ''));
});

test('dividing scores by a small temperature widens the gap', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Divide by the temperature' });
	const readout = widget.getByRole('status');
	await expect(readout).toContainText('1.17×');
	await widget.getByRole('slider', { name: /Temperature/ }).press('Home');
	await expect(widget.getByRole('columnheader', { name: '÷ 0.10' })).toBeVisible();
	await expect(readout).toContainText('Divided by 0.10');
});
