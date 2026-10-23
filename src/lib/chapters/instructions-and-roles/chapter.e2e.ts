import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('a persona does not help with sums', async ({ page }) => {
	await gotoHydrated(page, '/instructions-and-roles');
	const widget = page.getByRole('region', { name: 'Same question, different system prompts' });
	await widget.getByLabel('A persona').check();
	await expect(widget.locator('.template .system')).toHaveText('You are a world-famous physicist.');
	await expect(widget.getByRole('row', { name: /Right 5 of 8 3 of 8/ })).toBeVisible();
});
