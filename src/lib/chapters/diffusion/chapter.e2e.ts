import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the diffusion toy trains and paints', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/diffusion');
	const widget = page.getByRole('region', { name: 'Painting from noise' });
	await widget.getByRole('button', { name: 'Train' }).click();
	await expect(widget.getByRole('button', { name: 'Trained' })).toBeVisible({ timeout: 30000 });
	await expect(widget.getByText(/Done: the noise has become a new ring/)).toBeVisible();
});
