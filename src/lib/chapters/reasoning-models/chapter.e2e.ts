import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('thinking fixes strawberry, at a cost', async ({ page }) => {
	await gotoHydrated(page, '/reasoning-models');
	const widget = page.getByRole('region', { name: 'Thinking off, thinking on' });
	await widget.getByLabel('Puzzle').selectOption({ index: 2 });
	await expect(widget.getByText(/Answered 2, wrong/)).toBeVisible();
	await expect(widget.getByText(/Answered 3, right/)).toBeVisible();
	await widget.getByRole('button', { name: 'Show it all' }).click();
	await expect(widget.getByRole('region', { name: 'Scratch work' })).toContainText(
		'S-T-R-A-W-B-E-R-R-Y'
	);
	await expect(widget.getByRole('row', { name: /Thinking on 4 of 6/ })).toBeVisible();
});
