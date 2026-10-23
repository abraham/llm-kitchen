import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('each ending scores 4 of 6; the format is followed once', async ({ page }) => {
	await gotoHydrated(page, '/steps-and-structure');
	const widget = page.getByRole('region', { name: 'Ask for steps, ask for a format' });
	await expect(widget.getByText(/^0\.10$/)).toBeVisible();
	await expect(
		widget.getByRole('row', { name: /Steps, then a fixed format 4 of 6 1 of 6/ })
	).toBeVisible();
});
