import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('each token goes to k of 8 experts', async ({ page }) => {
	await gotoHydrated(page, '/mixture-of-experts');
	const widget = page.getByRole('region', { name: 'Send each token to a few experts' });
	await expect(widget.getByText('(chosen)')).toHaveCount(10);
	await expect(widget.getByText(/uses 25% of the experts' weights/)).toBeVisible();
	await widget.getByLabel('1', { exact: true }).check();
	await expect(widget.getByText('(chosen)')).toHaveCount(5);
	await expect(widget.getByText(/uses 12.5% of the experts' weights/)).toBeVisible();
});
