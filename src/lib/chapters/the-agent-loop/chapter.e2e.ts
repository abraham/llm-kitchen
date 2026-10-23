import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the agent loop ends with an answer', async ({ page }) => {
	await gotoHydrated(page, '/the-agent-loop');
	const widget = page.getByRole('region', { name: 'The agent loop' });
	const next = widget.getByRole('button', { name: 'Next →' });
	for (let i = 0; i < 4; i++) await next.click();
	await expect(widget.getByText(/contains 30 words/)).toBeVisible();
	await expect(widget.getByText(/this is the answer and the loop ends/)).toBeVisible();
});
