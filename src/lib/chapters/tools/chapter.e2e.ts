import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('tools off gets it wrong, tools on gets it right', async ({ page }) => {
	await gotoHydrated(page, '/tools');
	const widget = page.getByRole('region', { name: 'Tools off, tools on' });
	await expect(widget.getByText('7,050,952').last()).toBeVisible();
	await widget.getByLabel(/Tools on/).check();
	for (let i = 0; i < 3; i++) await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(widget.getByText('<call calculator>1234 * 5678</call>')).toBeVisible();
	await expect(widget.getByText('The product of 1234 and 5678 is 7006652.')).toBeVisible();
});
