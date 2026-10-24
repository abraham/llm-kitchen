import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('moving the threshold trades cost for right answers', async ({ page }) => {
	await gotoHydrated(page, '/routing');
	const widget = page.getByRole('region', { name: 'Ask the small model first' });
	const readouts = widget.locator('.readouts');
	await expect(readouts).toContainText('15 of 40 questions');
	await expect(readouts).toContainText('34 of 40');
	await expect(readouts).toContainText('70% of always asking the big model');

	const slider = widget.getByLabel(/Pass a question on/);
	await slider.focus();
	for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
	await expect(readouts).toContainText('25 of 40 questions');
	await expect(readouts).toContainText('37 of 40');

	await page.keyboard.press('Home');
	await expect(readouts).toContainText('0 of 40 questions');
	await expect(readouts).toContainText('26 of 40');
});
