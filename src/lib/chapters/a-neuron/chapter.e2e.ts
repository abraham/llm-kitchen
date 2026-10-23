import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the neuron multiplies, adds, and squashes', async ({ page }) => {
	await gotoHydrated(page, '/a-neuron');
	const widget = page.getByRole('region', { name: 'One neuron' });
	// Defaults: 1×0.8 + 0.5×(−1.2) + 0.3 = 0.5, ReLU(0.5) = 0.5.
	await expect(widget.getByText('= 0.50 → relu(0.50) = 0.50')).toBeVisible();
	await widget.getByRole('slider', { name: /Bias/ }).press('Home');
	// 0.8 − 0.6 − 2 = −1.8; ReLU turns it into 0.
	await expect(widget.getByText('= −1.80 → relu(−1.80) = 0.00')).toBeVisible();
	await widget.getByLabel('Activation function', { exact: true }).selectOption('none');
	await expect(widget.getByText('= −1.80 → −1.80')).toBeVisible();
});

test('a layer of neurons fences off a triangle', async ({ page }) => {
	await gotoHydrated(page, '/a-neuron');
	const widget = page.getByRole('region', { name: 'A layer of neurons' });
	// Defaults (0.5, 1): neuron 1 gives 1 − 0.8 = 0.2, so the output is 1 − 3×0.2 = 0.4.
	await expect(widget.getByText('= 0.40 → relu = 0.40')).toBeVisible();
	await widget.getByRole('slider', { name: /Input 2/ }).fill('0');
	await expect(widget.getByText('= 1.00 → relu = 1.00')).toBeVisible();
	await widget.getByRole('slider', { name: /Input 2/ }).fill('2');
	await expect(widget.getByText('= −2.60 → relu = 0.00')).toBeVisible();
	await widget.getByRole('checkbox', { name: '1' }).uncheck();
	await expect(widget.getByText('= 1.00 → relu = 1.00')).toBeVisible();
});
