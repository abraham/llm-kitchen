import { expect, test } from '@playwright/test';
import { label } from '../../curriculum/index.ts';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('step through one message and follow a link', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/end-to-end');
	const widget = page.getByRole('region', { name: 'One message, start to finish' });
	const detail = widget.locator('.detail');
	await expect(detail).toContainText('You type a message');
	await expect(detail).toContainText('Finish this: The cat sat on the');

	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(detail).toContainText('400-token');
	await widget.getByRole('button', { name: 'Next →' }).press('ArrowRight');
	await expect(detail).toContainText('only the last 93 need new work');

	await widget.getByRole('button', { name: /A probability for every token/ }).click();
	await expect(
		widget.getByRole('button', { name: /A probability for every token/ })
	).toHaveAttribute('aria-pressed', 'true');
	await expect(detail).toContainText('floor');
	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(detail).toContainText('7.6%');

	await widget.getByRole('button', { name: /Check and run the tool/ }).click();
	await expect(detail.locator('pre .result')).toContainText('Hey diddle diddle');
	await widget.getByRole('button', { name: /You see the reply/ }).click();
	await expect(detail).toContainText('Hey Diddle Diddle');

	await detail.getByRole('link', { name: `${label('the-model-is-not-the-product')}:` }).click();
	await expect(page).toHaveURL(/\/the-model-is-not-the-product\/?$/);
});
