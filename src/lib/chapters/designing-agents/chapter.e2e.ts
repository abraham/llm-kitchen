import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('more tool calls grow the loop but not the program or the plan', async ({ page }) => {
	await gotoHydrated(page, '/designing-agents');
	const widget = page.getByRole('region', { name: 'Three ways to run one task' });
	await expect(widget.getByText('Made-up example')).toBeVisible();
	const read = widget.getByRole('row', { name: /Tokens read in all/ });
	await expect(read).toContainText('1,170');
	await expect(read).toContainText('660');
	await expect(read).toContainText('780');

	await widget.getByRole('slider', { name: /Tool calls/ }).press('End');
	await expect(read).toContainText('3,990');
	await expect(read).toContainText('1,140');
	await expect(
		widget.getByRole('img', { name: /With 6 tool calls, step by step reads 3,990 tokens/ })
	).toBeVisible();
});
