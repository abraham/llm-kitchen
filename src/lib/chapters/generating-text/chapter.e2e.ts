import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the glass-box generator follows recordings and branches', async ({ page }) => {
	await gotoHydrated(page, '/generating-text');
	const widget = page.getByRole('region', { name: 'Glass-box generator' });
	const context = widget.getByLabel('Text so far');
	await widget.getByRole('button', { name: 'Add the most likely' }).click();
	await expect(context.getByRole('img', { name: /floor/ })).toBeVisible();

	await widget.getByRole('button', { name: 'Undo' }).click();
	await expect(context.getByRole('img', { name: /floor/ })).toHaveCount(0);
	await widget.getByRole('button', { name: /Add “·bed”/ }).click();
	await widget.getByRole('button', { name: 'Add the most likely' }).click();
	await expect(context.getByRole('img', { name: /^","/ })).toBeVisible();

	// A token with no recording can't be picked without the live model.
	await widget.getByRole('button', { name: 'Undo' }).click();
	await widget.getByRole('button', { name: 'Undo' }).click();
	await expect(widget.getByRole('button', { name: /Add “·bench”.*no recording/ })).toBeDisabled();
	await expect(widget.getByRole('link', { name: 'Choose a model tier' })).toBeVisible();
});
