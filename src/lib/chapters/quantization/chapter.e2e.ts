import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('rounding to fewer bits holds, drifts, then breaks', async ({ page }) => {
	await gotoHydrated(page, '/quantization');
	const widget = page.getByRole('region', { name: "Rounding GPT-2's numbers" });
	const bits = widget.getByLabel('Bits per number');
	await expect(widget).toContainText('498 MB');
	await bits.focus();
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await expect(bits).toHaveAttribute('aria-valuetext', '8 bits');
	await expect(widget).toContainText('Same words as the weights as trained.');
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await expect(bits).toHaveAttribute('aria-valuetext', '4 bits');
	await expect(widget).toContainText('70 MB');
	await expect(widget.locator('.generated')).toContainText('stack. The stack.');

	await expect(widget.getByRole('status')).toContainText('Stored integer q = −5');
	await widget.getByRole('button', { name: /Smallest/ }).click();
	await expect(widget.getByRole('status')).toContainText('rounded all the way to 0');
	await widget.getByRole('button', { name: /Dropped/ }).click();
	await expect(widget.getByRole('status')).toContainText('28 bits dropped per weight');
});
