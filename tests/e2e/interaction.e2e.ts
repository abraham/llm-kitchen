import { expect, test } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`steps through the sample trace (${reducedMotion} motion)`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion });
		await page.goto('/guessing-game');
		const widget = page.getByRole('region', { name: 'One token at a time' });
		await expect(widget.getByText('Made-up example')).toBeVisible();

		const next = widget.getByRole('button', { name: 'Next →' });
		await expect(widget.getByText('Step 1 of 6')).toBeVisible();
		await expect(widget.getByRole('table')).toContainText('40%');

		// Step 2 spins the wheel; it should land on the chosen token.
		await next.click();
		await expect(widget.getByRole('img', { name: 'Spinner landed on ·mat' })).toBeVisible({
			timeout: reducedMotion === 'reduce' ? 500 : 3000
		});

		// Step 3 appends the chosen token; the keyboard works too.
		await next.press('ArrowRight');
		await expect(widget.getByText('Step 3 of 6')).toBeVisible();
		await expect(widget.getByRole('img', { name: '"space mat", token 6' })).toBeVisible();

		await next.press('End');
		await expect(widget.getByText('Step 6 of 6')).toBeVisible();
		await expect(next).toHaveAttribute('aria-disabled', 'true');
		await expect(next).toBeFocused();

		await widget.getByRole('button', { name: 'Reset' }).click();
		await expect(widget.getByText('Step 1 of 6')).toBeVisible();
	});
}
