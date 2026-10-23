import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('quirks lab presets and the spelling blind spot', async ({ page }) => {
	await gotoHydrated(page, '/quirks-and-limits');
	const lab = page.getByRole('region', { name: 'Quirks lab' });
	await lab.getByLabel('Start from').selectOption({ label: 'Arithmetic: 2 + 2' });
	await expect(lab.getByRole('button', { name: /Add “·3”, 10%/ })).toBeVisible();

	const spelling = page.getByRole('region', { name: 'Letters the model never sees' });
	await expect(spelling.getByText('the model sees: one token')).toBeVisible();
	await spelling.getByLabel(/Text/).fill('strawberry');
	await expect(spelling.getByText('the model sees: 3 tokens')).toBeVisible();
});
