import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('an injected claim reaches the summary', async ({ page }) => {
	await gotoHydrated(page, '/prompt-injection');
	const lab = page.getByRole('region', { name: 'The prompt injection lab' });
	await expect(lab.getByText(/has been cancelled due to unforeseen circumstances/)).toBeVisible();
	await expect(lab.getByText('The attacker’s claim made it into the summary.')).toBeVisible();
	await lab
		.getByRole('button', { name: /A fake new message from you, Remove chat markers/ })
		.click();
	await lab.getByLabel('Color by source').uncheck();
	await expect(lab.locator('.note')).toContainText('with 3 role markers');
});
