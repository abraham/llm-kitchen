import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const PAGES = [
	'/encoders',
	'/mixture-of-experts',
	'/recurrent-models',
	'/seeing-pictures',
	'/diffusion',
	'/recap',
	'/end-to-end',
	'/picking-a-model',
	'/quiz'
];

for (const path of PAGES) {
	test(`${path} loads its widgets and has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByText(/Loading/)).toHaveCount(0);
		await expect(page.locator('section.widget').first()).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 30: BERT reads both sides of the blank; GPT-2 only the left', async ({ page }) => {
	await gotoHydrated(page, '/encoders');
	const fill = page.getByRole('region', { name: 'Fill in the blank' });
	await expect(fill.getByRole('rowheader', { name: 'top' })).toBeVisible();
	await fill.getByLabel('Sentence').selectOption({ index: 1 });
	await expect(fill.getByRole('rowheader', { name: 'market' })).toBeVisible();

	const mask = page.getByRole('region', { name: 'Who can look at whom' });
	await expect(mask.getByText(/can look at 6 of 10 tokens/)).toBeVisible();
	await mask.getByLabel(/BERT \(encoder\)/).check();
	await expect(mask.getByText(/can look at 10 of 10 tokens/)).toBeVisible();
});

test('Ch 31: each token goes to k of 8 experts', async ({ page }) => {
	await gotoHydrated(page, '/mixture-of-experts');
	const widget = page.getByRole('region', { name: 'Send each token to a few experts' });
	await expect(widget.getByText('(chosen)')).toHaveCount(10);
	await expect(widget.getByText(/uses 25% of the experts' weights/)).toBeVisible();
	await widget.getByLabel('1', { exact: true }).check();
	await expect(widget.getByText('(chosen)')).toHaveCount(5);
	await expect(widget.getByText(/uses 12.5% of the experts' weights/)).toBeVisible();
});

test('Ch 32: the recurrent model trains; attention memory grows', async ({ page }) => {
	await gotoHydrated(page, '/recurrent-models');
	const rnn = page.getByRole('region', { name: 'A model with a memory' });
	await rnn.getByRole('button', { name: 'Train' }).click();
	await expect(rnn.getByText(/step [1-9]\d*/)).toBeVisible();
	await rnn.getByRole('button', { name: 'Pause' }).click();
	await expect(
		rnn.getByRole('img', { name: /The model's memory: a list of 32 numbers/ })
	).toBeVisible();

	const growth = page.getByRole('region', { name: 'Memory as the text grows' });
	await growth.getByLabel(/Tokens read so far/).fill('1024');
	await expect(growth.getByText('18,874,368 numbers')).toBeVisible();
	await expect(growth.getByText('32 numbers', { exact: true })).toBeVisible();
});

test('Ch 33: patches and matching captions', async ({ page }) => {
	await gotoHydrated(page, '/seeing-pictures');
	const patches = page.getByRole('region', { name: 'Cut a picture into tokens' });
	await patches.getByRole('slider', { name: /Patch/ }).fill('0');
	await expect(patches.getByText(/looks exactly like \d+ others/)).toBeVisible();

	const match = page.getByRole('region', { name: 'Match words to pictures' });
	await match.getByLabel('Words').selectOption('a blue star');
	await expect(match.locator('li.best img')).toHaveAttribute('alt', 'A blue star');
});

test('Ch 34: the diffusion toy trains and paints', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/diffusion');
	const widget = page.getByRole('region', { name: 'Painting from noise' });
	await widget.getByRole('button', { name: 'Train' }).click();
	await expect(widget.getByRole('button', { name: 'Trained' })).toBeVisible({ timeout: 30000 });
	await expect(widget.getByText(/Done: the noise has become a new ring/)).toBeVisible();
});

test('Ch 35: zoom into the model', async ({ page }) => {
	await gotoHydrated(page, '/recap');
	const picture = page.getByRole('region', { name: 'The whole picture' });
	await picture.getByRole('button', { name: 'Zoom in on the model' }).click();
	await picture.getByRole('button', { name: /Zoom in on 12 transformer blocks/ }).click();
	await expect(picture.getByRole('link', { name: /Ch 9: Attention/ })).toBeVisible();
	await picture.getByRole('button', { name: 'The model' }).click();
	await picture.getByRole('button', { name: 'Zoom in on other kinds of models' }).click();
	await expect(picture.getByRole('link', { name: /Ch 34: Painting from noise/ })).toBeVisible();
	await picture.getByRole('button', { name: 'A chat app or agent' }).click();
	await picture.getByRole('button', { name: 'Zoom in on you' }).click();
	await expect(picture.getByRole('link', { name: /Ch 19: Learning from examples/ })).toBeVisible();
});

test('Ch 36: step through one message and follow a link', async ({ page }) => {
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

	await detail.getByRole('link', { name: /Ch 23:/ }).click();
	await expect(page).toHaveURL(/\/the-model-is-not-the-product\/?$/);
});

test('Ch 37: decode a model name and check the memory', async ({ page }) => {
	await gotoHydrated(page, '/picking-a-model');
	const decoder = page.getByRole('region', { name: 'What the name tells you' });
	await decoder.getByLabel('Model').selectOption('google/gemma-4-E2B-it-qat-mobile-transformers');
	const name = decoder.getByRole('group', { name: 'Parts of the name' });
	await expect(name.getByRole('button')).toHaveText([
		'gemma-4',
		'E2B',
		'it',
		'qat',
		'mobile',
		'transformers'
	]);
	await name.getByRole('button', { name: 'qat' }).click();
	await expect(decoder.locator('.selected')).toContainText('Quantization-aware training');
	await expect(decoder).toContainText('128K tokens');

	const memory = page.getByRole('region', { name: 'Will it fit?' });
	await expect(memory.locator('.total')).toContainText('61 GB');
	await memory.getByLabel('4', { exact: true }).check();
	await expect(memory.locator('.total')).toContainText('15 GB');

	await decoder.getByLabel('Model').selectOption('google/gemma-4-26B-A4B-it');
	await decoder.getByRole('link', { name: /Ch 31:/ }).click();
	await expect(page).toHaveURL(/\/mixture-of-experts\/?$/);
});

test('Ch 38: take the quiz and see what to revisit', async ({ page }) => {
	await gotoHydrated(page, '/quiz');
	const quiz = page.getByRole('region', { name: 'Quick check' });
	for (const answer of [
		'The model thinks for longer',
		'It reads tokens, not letters',
		'Training nudges every weight to make the right next token a little more likely',
		'It lets each token pull in information from any earlier token',
		'Probabilities for the next token',
		'It needs about a quarter of the memory, and coarse rounding can hurt its answers',
		'It is exactly the same, written in fewer passes of the big model',
		'It writes scratch work as tokens before answering',
		'Nothing but its context: attention can copy the pattern from the examples',
		'The harness',
		'The provider reuses its work on the unchanged start of the prompt',
		'The model reads the page and your request as one stream of text',
		'Guardrails in the harness, like asking you first',
		'Its attention can look at the words after the blank too'
	]) {
		await quiz.getByLabel(answer, { exact: true }).check();
	}
	await quiz.getByRole('button', { name: 'Check my answers' }).click();
	await expect(quiz.getByText('13 of 14 right.')).toBeVisible();
	const revisit = quiz.locator('.revisit');
	await expect(revisit.getByRole('link')).toHaveCount(1);
	await revisit.getByRole('link', { name: /Ch 2:/ }).click();
	await expect(page).toHaveURL(/\/probability-and-sampling\/?$/);
});
