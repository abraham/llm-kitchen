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

test('a figure further down animates in when it is scrolled into view', async ({ page }) => {
	await gotoHydrated(page, '/scale');
	const figure = page
		.getByRole('region', { name: 'The scaling curve' })
		.locator('svg[role="img"]')
		.first();
	await expect(figure).toHaveAttribute('data-entering');
	await figure.scrollIntoViewIfNeeded();
	await expect(figure).not.toHaveAttribute('data-entering');
	expect(
		await figure.evaluate((svg) => svg.getAnimations({ subtree: true }).length)
	).toBeGreaterThan(0);
});

test('with reduced motion, figures show at once', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/scale');
	const figure = page
		.getByRole('region', { name: 'The scaling curve' })
		.locator('svg[role="img"]')
		.first();
	await expect(figure).not.toHaveAttribute('data-entering');
	await figure.scrollIntoViewIfNeeded();
	expect(await figure.evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
});
