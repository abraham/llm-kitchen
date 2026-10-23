import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test("the big model checks the small model's guesses", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/speculative-decoding');
	const widget = page.getByRole('region', { name: 'A small model guesses, a big one checks' });
	const count = widget.locator('.count');
	await expect(count).toContainText('3 tokens in 1 pass');
	const next = widget.getByRole('button', { name: 'Next →' });
	for (let i = 0; i < 6; i++) await next.click();
	await expect(count).toContainText('30 tokens in 7 passes');
	await expect(count).toContainText('exactly what GPT-2 medium writes on its own');

	await widget.getByLabel('Prompt').selectOption('The capital of France is');
	await expect(count).toContainText('1 token in 1 pass');
	await expect(widget.locator('.explain')).toContainText('The first guess is wrong');
});
