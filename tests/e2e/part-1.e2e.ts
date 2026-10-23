import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const chapters = ['/guessing-game', '/predicting-by-counting', '/probability-and-sampling'];

for (const path of chapters) {
	test(`${path} loads its widgets and has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByText('Loading recorded data…')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 0: a guess is compared with the recorded model', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	await page.getByLabel('The cat sat on the …').fill('floor');
	await page.getByRole('button', { name: /Compare with GPT-2 small/ }).click();
	await expect(page.getByText(/its number 1 guess/)).toBeVisible();

	await page.getByLabel('The cat sat on the …').fill('zebra');
	await page.getByRole('button', { name: /Compare/ }).click();
	await expect(page.getByText(/isn't in GPT-2 small's top 50/)).toBeVisible();
});

test('Ch 0: citations are numbered and link to the sources list', async ({ page }) => {
	await gotoHydrated(page, '/guessing-game');
	const first = page.locator('sup.cite a').first();
	await expect(first).toHaveText('[1]');
	await first.click();
	await expect(page.locator('#source-shannon1951')).toBeInViewport();
});

test('Ch 1: counting builds the table, then the model generates', async ({ page }) => {
	await gotoHydrated(page, '/predicting-by-counting');
	const widget = page.getByRole('region', { name: 'Build a bigram model' });
	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(widget.getByText('just counted mary → had')).toBeVisible();
	await widget.getByRole('button', { name: 'Count everything' }).click();
	await widget.getByLabel('After the word').selectOption('little');
	await expect(widget.getByRole('table')).toContainText('33%');
	await widget.getByRole('button', { name: 'Generate' }).click();
	await expect(widget.locator('.generated')).not.toBeEmpty();
});

test('Ch 2: temperature 0 puts everything on the top word', async ({ page }) => {
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

test('Ch 2: dividing scores by a small temperature widens the gap', async ({ page }) => {
	await gotoHydrated(page, '/probability-and-sampling');
	const widget = page.getByRole('region', { name: 'Divide by the temperature' });
	const readout = widget.locator('.readout');
	await expect(readout).toContainText('1.17×');
	await widget.getByRole('slider', { name: /Temperature/ }).press('Home');
	await expect(widget.getByRole('columnheader', { name: '÷ 0.10' })).toBeVisible();
	await expect(readout).toContainText('Divided by 0.10');
});
