import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const PAGES = [
	'/encoders',
	'/mixture-of-experts',
	'/recurrent-models',
	'/seeing-pictures',
	'/diffusion',
	'/reasoning-models',
	'/recap'
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

test('Ch 20: BERT reads both sides of the blank; GPT-2 only the left', async ({ page }) => {
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

test('Ch 21: each token goes to k of 8 experts', async ({ page }) => {
	await gotoHydrated(page, '/mixture-of-experts');
	const widget = page.getByRole('region', { name: 'Send each token to a few experts' });
	await expect(widget.getByText('(chosen)')).toHaveCount(10);
	await expect(widget.getByText(/uses 25% of the experts' weights/)).toBeVisible();
	await widget.getByLabel('1', { exact: true }).check();
	await expect(widget.getByText('(chosen)')).toHaveCount(5);
	await expect(widget.getByText(/uses 12.5% of the experts' weights/)).toBeVisible();
});

test('Ch 22: the recurrent model trains; attention memory grows', async ({ page }) => {
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

test('Ch 23: patches and matching captions', async ({ page }) => {
	await gotoHydrated(page, '/seeing-pictures');
	const patches = page.getByRole('region', { name: 'Cut a picture into tokens' });
	await patches.getByRole('slider', { name: /Patch/ }).fill('0');
	await expect(patches.getByText(/looks exactly like \d+ others/)).toBeVisible();

	const match = page.getByRole('region', { name: 'Match words to pictures' });
	await match.getByLabel('Words').selectOption('a blue star');
	await expect(match.locator('li.best img')).toHaveAttribute('alt', 'A blue star');
});

test('Ch 24: the diffusion toy trains and paints', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoHydrated(page, '/diffusion');
	const widget = page.getByRole('region', { name: 'Painting from noise' });
	await widget.getByRole('button', { name: 'Train' }).click();
	await expect(widget.getByRole('button', { name: 'Trained' })).toBeVisible({ timeout: 30000 });
	await expect(widget.getByText(/Done: the noise has become a new ring/)).toBeVisible();
});

test('Ch 25: thinking fixes strawberry, at a cost', async ({ page }) => {
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

test('Ch 26: zoom into the model and take the quiz', async ({ page }) => {
	await gotoHydrated(page, '/recap');
	const picture = page.getByRole('region', { name: 'The whole picture' });
	await picture.getByRole('button', { name: 'Zoom in on the model' }).click();
	await picture.getByRole('button', { name: /Zoom in on 12 transformer blocks/ }).click();
	await expect(picture.getByRole('link', { name: /Ch 9: Attention/ })).toBeVisible();
	await picture.getByRole('button', { name: 'The model' }).click();
	await picture.getByRole('button', { name: 'Zoom in on other kinds of models' }).click();
	await expect(picture.getByRole('link', { name: /Ch 24: Painting from noise/ })).toBeVisible();

	const quiz = page.getByRole('region', { name: 'Quick check' });
	for (const answer of [
		'Probabilities for the next token',
		'It reads tokens, not letters',
		'It lets each token pull in information from any earlier token',
		'The harness',
		'Guardrails in the harness, like asking you first',
		'Its attention can look at the words after the blank too',
		'It writes scratch work as tokens before answering'
	]) {
		await quiz.getByLabel(answer, { exact: true }).check();
	}
	await quiz.getByRole('button', { name: 'Check my answers' }).click();
	await expect(quiz.getByText('7 of 7 right.')).toBeVisible();
});
