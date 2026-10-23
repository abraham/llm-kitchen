import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`steps through a recorded generation (${reducedMotion} motion)`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion });
		await gotoHydrated(page, '/guessing-game');
		const widget = page.getByRole('region', { name: 'The guessing game, repeated' });
		await expect(widget.getByText('Recorded · GPT-2 small')).toBeVisible();

		const next = widget.getByRole('button', { name: 'Next →' });
		await expect(widget.getByText('Step 1 of 12')).toBeVisible();
		await expect(widget.getByRole('table')).toContainText('7.6%');

		// Step 2 spins the wheel; it should land on the chosen token.
		await next.click();
		await expect(widget.getByRole('img', { name: 'Spinner landed on ·floor' })).toBeVisible({
			timeout: reducedMotion === 'reduce' ? 500 : 3000
		});

		// Step 3 appends the chosen token; the keyboard works too.
		await next.press('ArrowRight');
		await expect(widget.getByText('Step 3 of 12')).toBeVisible();
		await expect(widget.getByRole('img', { name: '"space floor", token 4314' })).toBeVisible();

		await next.press('End');
		await expect(widget.getByText('Step 12 of 12')).toBeVisible();
		await expect(next).toHaveAttribute('aria-disabled', 'true');
		await expect(next).toBeFocused();

		await widget.getByRole('button', { name: 'Reset' }).click();
		await expect(widget.getByText('Step 1 of 12')).toBeVisible();
	});
}
