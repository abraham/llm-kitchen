import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

for (const path of ['/a-neuron', '/learning-from-mistakes']) {
	test(`${path} has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 6: the neuron multiplies, adds, and squashes', async ({ page }) => {
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

test('Ch 7: gradient descent steps downhill', async ({ page }) => {
	await gotoHydrated(page, '/learning-from-mistakes');
	const widget = page.getByRole('region', { name: 'Rolling downhill' });
	const readout = widget.locator('.readout');
	const lossOf = async () => Number((await readout.textContent())!.match(/loss\s+(\d+\.\d+)/)![1]);
	const before = await lossOf();
	await widget.getByRole('button', { name: 'Take 20 steps' }).click();
	expect(await lossOf()).toBeLessThan(before);
});

test('Ch 7: the curve fitter and the tiny language model train', async ({ page }) => {
	await gotoHydrated(page, '/learning-from-mistakes');
	const curve = page.getByRole('region', { name: 'Train a tiny network' });
	await curve.getByRole('button', { name: 'Train' }).click();
	await expect(curve.getByText(/step [1-9]\d*/)).toBeVisible();
	await curve.getByRole('button', { name: 'Pause' }).click();

	const lm = page.getByRole('region', { name: 'Train a tiny language model' });
	await expect(lm.getByText(/weights, learning to predict/)).toBeVisible();
	await lm.getByRole('button', { name: 'Train' }).click();
	await expect(lm.getByText(/step (2[5-9]\d|[3-9]\d\d|\d{4})/)).toBeVisible({ timeout: 15000 });
	await lm.getByRole('button', { name: 'Pause' }).click();
	await expect(lm.locator('.samples li')).not.toHaveCount(0);
});
