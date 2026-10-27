import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('wrong labels: Qwen ignores half-wrong ones and follows flipped ones', async ({ page }) => {
	await gotoHydrated(page, '/few-shot');
	const widget = page.getByRole('region', { name: 'Do the labels have to be right?' });
	const qwen = widget.getByRole('row', { name: /Qwen2.5-1.5B-Instruct/ });
	await expect(qwen).toContainText('24 of 24');

	await widget.getByLabel('Half the labels wrong').check();
	await expect(widget.getByText('wrong', { exact: true })).toHaveCount(4);
	await expect(qwen).toContainText('24 of 24');

	await widget.getByLabel('Every label flipped').check();
	await expect(qwen.getByRole('cell').nth(2)).toHaveText('23 of 24');
	const gpt2 = widget.getByRole('row', { name: /GPT-2 small/ });
	await expect(gpt2).toContainText('same label for every review');
});

test('examples teach a made-up rule', async ({ page }) => {
	await gotoHydrated(page, '/few-shot');
	const widget = page.getByRole('region', { name: 'Learning from examples' });
	await expect(widget.getByRole('row', { name: /happy sad .* 96%/ })).toBeVisible();
	await widget.getByLabel('Made-up labels').check();
	await widget.getByLabel('0', { exact: true }).check();
	await expect(widget.locator('pre')).toHaveText(/^pear -> ___$/);

	const head = page.getByRole('region', { name: 'Where the arrow looks' });
	await expect(head.getByText(/attention head 5\.0/)).toBeVisible();
});
