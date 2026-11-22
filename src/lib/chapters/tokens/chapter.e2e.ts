import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../../../../tests/e2e/helpers.ts';

test('the GPT-2 tokenizer splits text and compares with other tokenizers', async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	const widget = page.getByRole('region', { name: 'See the tokens' });
	const gpt2 = widget.getByRole('region', { name: 'GPT-2 tokens' });
	// Token counts only render after hydration, so typing before then would be lost.
	await expect(gpt2.getByText(/\d+ tokens/)).toBeVisible();
	await widget.getByLabel('Paste or type any text').fill('strawberry');
	await expect(gpt2.getByText('3 tokens')).toBeVisible();
	await expect(gpt2.getByRole('img', { name: '"raw", token 1831' })).toBeVisible();

	await widget.getByLabel('Paste or type any text').fill(' strawberry');
	await expect(gpt2.getByRole('img', { name: '"space strawberry", token 41236' })).toBeVisible();

	await widget.getByLabel(/GPT-4o/).check();
	await expect(widget.getByRole('region', { name: 'GPT-4o tokens' })).toBeVisible();
});

test('BPE merges e+s first, then es+t', async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	const widget = page.getByRole('region', { name: 'Byte pair encoding, one merge at a time' });
	const next = widget.getByRole('button', { name: 'Next →' });
	const explain = widget.locator('.explain');
	await next.click();
	await expect(explain).toContainText('“e” + “s” appeared 9 times');
	await next.click();
	await expect(explain).toContainText('“es” + “t” appeared 9 times');
	await expect(widget.getByText('Tokens needed for the whole text: 77')).toBeVisible();
});

test('token diff inspector compares edits and switches tokenizers', async ({ page }) => {
	await gotoHydrated(page, '/tokens');
	const widget = page.getByRole('region', { name: 'Compare how text splits' });
	await expect(widget.getByText('3 → 1 token')).toBeVisible();
	await expect(widget.getByRole('status')).toContainText('token 41236 in GPT-2');

	await widget.getByRole('button', { name: 'cafe → café' }).click();
	await expect(widget.getByText('2 → 3 tokens')).toBeVisible();
	await widget.getByRole('button', { name: /"é", token 2634/ }).click();
	await expect(widget.getByText('C3 A9')).toBeVisible();

	await widget.getByRole('button', { name: 'return 0 → indented' }).click();
	await expect(widget.getByText('2 → 9 tokens')).toBeVisible();
	await widget.getByLabel('GPT-4', { exact: true }).check();
	await expect(widget.getByText('3 → 4 tokens')).toBeVisible();
});
