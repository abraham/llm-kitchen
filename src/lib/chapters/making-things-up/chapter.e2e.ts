import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('ten samples scatter on an invented book and agree on a wrong Tour de France winner', async ({
	page
}) => {
	await gotoHydrated(page, '/making-things-up');
	const widget = page.getByRole('region', { name: 'Ask it ten times' });
	const rows = widget.getByRole('table').locator('tbody tr');
	await expect(rows).toHaveCount(9);
	await expect(widget.getByRole('status')).toContainText('flags the answer as a likely guess');
	await expect(widget.locator('.readouts')).toContainText('4 of the 5 wrong answers');
	await expect(widget.locator('.greedy')).toContainText('Helen Macdonald');

	await widget
		.getByLabel('Question')
		.selectOption({ label: 'Who won the Tour de France in 1987?' });
	await expect(rows).toHaveCount(1);
	await expect(rows.first()).toContainText('Eddy Merckx');
	await expect(rows.first()).toContainText('✗ wrong');
	await expect(widget.getByRole('status')).toContainText('passes “Eddy Merckx” on');
	await expect(widget).toContainText('Stephen Roche');
});

test('allowing "I don\'t know" makes it decline the invented book', async ({ page }) => {
	await gotoHydrated(page, '/making-things-up');
	const widget = page.getByRole('region', { name: 'Ask it ten times' });
	await widget.getByLabel('Allow “I don’t know” in the system prompt').check();
	await expect(widget.getByRole('table').locator('tbody tr')).toHaveCount(1);
	await expect(widget.getByRole('status')).toContainText('the model doesn’t know');
	await expect(widget.locator('.readouts')).toContainText('3 declined');
	await expect(widget).toContainText('If you are not sure of the answer');
});
