import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('gradient descent steps downhill', async ({ page }) => {
	await gotoHydrated(page, '/learning-from-mistakes');
	const widget = page.getByRole('region', { name: 'Rolling downhill' });
	const readout = widget.locator('.readout');
	const lossOf = async () => Number((await readout.textContent())!.match(/loss\s+(\d+\.\d+)/)![1]);
	const before = await lossOf();
	await widget.getByRole('button', { name: 'Take 20 steps' }).click();
	expect(await lossOf()).toBeLessThan(before);
});

test('one training step nudges every number of the curve fitter', async ({ page }) => {
	await gotoHydrated(page, '/learning-from-mistakes');
	const curve = page.getByRole('region', { name: 'Train a tiny network' });
	const first = curve.locator('tbody tr').first().locator('td').first();
	const before = await first.locator('.mono').textContent();
	await curve.getByRole('button', { name: 'Take 1 step' }).click();
	await expect(curve.getByText(/^step 1 ·/)).toBeVisible();
	// Adam's first step moves every number by the step size, 0.02.
	await expect(
		curve.getByText(/nudged all 49 numbers below, each by at\s+most\s+0\.020/)
	).toBeVisible();
	await expect(first.locator('.mono')).not.toHaveText(before!);
	await expect(curve.locator('.arrow.up, .arrow.down')).toHaveCount(49);
});

test('the curve fitter and the tiny language model train', async ({ page }) => {
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
