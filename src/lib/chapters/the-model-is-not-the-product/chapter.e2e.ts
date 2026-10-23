import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('peeling back the prompt', async ({ page }) => {
	await gotoHydrated(page, '/the-model-is-not-the-product');
	const widget = page.getByRole('region', { name: 'What the model actually sees' });
	const raw = widget.getByLabel('The text sent to the model');
	await expect(raw).toHaveText('Finish this: The cat sat on the');
	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(raw).toContainText('<|im_start|>user');
	for (let i = 0; i < 4; i++) await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(raw).toContainText('<tool_response>');
	await expect(widget.getByText('The second call: 493 tokens')).toBeVisible();
});
