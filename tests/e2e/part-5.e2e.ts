import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

for (const path of [
	'/generating-text',
	'/scale',
	'/quantization',
	'/speculative-decoding',
	'/predictor-to-assistant',
	'/quirks-and-limits',
	'/reasoning-models'
]) {
	test(`${path} loads its widgets and has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByText(/Loading/)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 11: the glass-box generator follows recordings and branches', async ({ page }) => {
	await gotoHydrated(page, '/generating-text');
	const widget = page.getByRole('region', { name: 'Glass-box generator' });
	const context = widget.getByLabel('Text so far');
	await widget.getByRole('button', { name: 'Add the most likely' }).click();
	await expect(context.getByRole('img', { name: /floor/ })).toBeVisible();

	await widget.getByRole('button', { name: 'Undo' }).click();
	await expect(context.getByRole('img', { name: /floor/ })).toHaveCount(0);
	await widget.getByRole('button', { name: /Add “·bed”/ }).click();
	await widget.getByRole('button', { name: 'Add the most likely' }).click();
	await expect(context.getByRole('img', { name: /^","/ })).toBeVisible();

	// A token with no recording can't be picked without the live model.
	await widget.getByRole('button', { name: 'Undo' }).click();
	await widget.getByRole('button', { name: 'Undo' }).click();
	await expect(widget.getByRole('button', { name: /Add “·bench”.*no recording/ })).toBeDisabled();
	await expect(widget.getByRole('button', { name: 'Run it live…' })).toBeVisible();
});

test('Ch 12: switching the scale metric shows unpublished numbers', async ({ page }) => {
	await gotoHydrated(page, '/scale');
	const widget = page.getByRole('region', { name: 'How big is big?' });
	await expect(widget.getByRole('row', { name: /GPT-3.*175 billion/ })).toBeVisible();
	await widget.getByLabel('Compute').check();
	await expect(widget.getByRole('row', { name: /GPT-2 small.*not published/ })).toBeVisible();

	const chart = page.getByRole('region', { name: 'The scaling curve' });
	await chart.getByLabel(/Weights:/).fill('11');
	await expect(chart.locator('.readout')).toContainText('outside the range');
});

test('Ch 13: rounding to fewer bits holds, drifts, then breaks', async ({ page }) => {
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
});

test("Ch 14: the big model checks the small model's guesses", async ({ page }) => {
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

test('Ch 15: the chat template and base vs. instruct', async ({ page }) => {
	await gotoHydrated(page, '/predictor-to-assistant');
	const template = page.getByRole('region', { name: 'What the model actually reads' });
	await template.getByLabel('Your next message').fill('Hello there');
	await expect(template.getByLabel('The text sent to the model')).toContainText(
		'<|im_start|>user\nHello there<|im_end|>'
	);

	const compare = page.getByRole('region', { name: 'Same words, different models' });
	await expect(compare.getByRole('region', { name: /base model$/ })).toContainText('Options are');
	await compare.getByLabel('Prompt').selectOption({ label: 'What is the capital of France?' });
	await expect(compare.getByRole('region', { name: /in its chat format/ })).toContainText(
		'Stopped by itself'
	);
});

test('Ch 16: quirks lab presets and the spelling blind spot', async ({ page }) => {
	await gotoHydrated(page, '/quirks-and-limits');
	const lab = page.getByRole('region', { name: 'Quirks lab' });
	await lab.getByLabel('Start from').selectOption({ label: 'Arithmetic: 2 + 2' });
	await expect(lab.getByRole('button', { name: /Add “·3”, 10%/ })).toBeVisible();

	const spelling = page.getByRole('region', { name: 'Letters the model never sees' });
	await expect(spelling.getByText('the model sees: one token')).toBeVisible();
	await spelling.getByLabel(/Text/).fill('strawberry');
	await expect(spelling.getByText('the model sees: 3 tokens')).toBeVisible();
});

test('Ch 17: thinking fixes strawberry, at a cost', async ({ page }) => {
	await gotoHydrated(page, '/reasoning-models');
	const widget = page.getByRole('region', { name: 'Thinking off, thinking on' });
	await widget.getByLabel('Puzzle').selectOption({ index: 2 });
	await expect(widget.getByText(/Answered 2, wrong/)).toBeVisible();
	await expect(widget.getByText(/Answered 3, right/)).toBeVisible();
	await widget.getByRole('button', { name: 'Show it all' }).click();
	await expect(widget.getByRole('region', { name: 'Scratch work' })).toContainText(
		'S-T-R-A-W-B-E-R-R-Y'
	);
	await expect(widget.getByRole('row', { name: /Thinking on 4 of 6/ })).toBeVisible();
});
