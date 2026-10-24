import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('aiming for a score changes how the model plays', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/decision-models');
	const widget = page.getByRole('region', { name: 'Aim for a score' });
	const status = widget.locator('.status');
	await expect(widget.getByText('413 of 4,000 training runs scored 12.')).toBeVisible();

	await widget.getByRole('button', { name: 'Play' }).click();
	await expect(status).toHaveText('Reached the goal in 8 moves: scored 12.');

	const slider = widget.getByLabel('Score to aim for');
	await slider.focus();
	await page.keyboard.press('Home');
	for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
	await expect(widget.getByText('of 4,000 training runs scored −14.')).toBeVisible();
	await expect(status).toHaveText('Aiming for −14. Step through the run, or play it.');

	const step = widget.getByRole('button', { name: 'Step' });
	for (let i = 0; i < 3; i++) await step.click();
	await expect(status).toContainText('Move 3:');
	await step.click();
	await expect(status).toHaveText('Fell into a pit on move 4: scored −14.');
	await expect(step).toBeDisabled();
});
