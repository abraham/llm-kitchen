import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const PAGES = [
	'/prompts-as-documents',
	'/few-shot',
	'/instructions-and-roles',
	'/steps-and-structure',
	'/where-prompts-break',
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

test('Ch 28: setting the scene changes the next word', async ({ page }) => {
	await gotoHydrated(page, '/prompts-as-documents');
	const widget = page.getByRole('region', { name: 'Change the start of the document' });
	await widget.getByLabel(/It was bedtime/).check();
	await expect(widget.getByRole('row', { name: /bed.*22%/ }).first()).toBeVisible();
	await widget.getByLabel('Frame a question').check();
	await expect(widget.getByRole('table', { name: /Chance of “Paris” next/ })).toBeVisible();
});

test('Ch 29: examples teach a made-up rule', async ({ page }) => {
	await gotoHydrated(page, '/few-shot');
	const widget = page.getByRole('region', { name: 'Learning from examples' });
	await expect(widget.getByRole('row', { name: /happy sad .* 96%/ })).toBeVisible();
	await widget.getByLabel('Made-up labels').check();
	await widget.getByLabel('0', { exact: true }).check();
	await expect(widget.locator('pre')).toHaveText(/^pear -> ___$/);

	const head = page.getByRole('region', { name: 'Where the arrow looks' });
	await expect(head.getByText(/attention head 5\.0/)).toBeVisible();
});

test('Ch 30: a persona does not help with sums', async ({ page }) => {
	await gotoHydrated(page, '/instructions-and-roles');
	const widget = page.getByRole('region', { name: 'Same question, different system prompts' });
	await widget.getByLabel('A persona').check();
	await expect(widget.locator('.template .system')).toHaveText('You are a world-famous physicist.');
	await expect(widget.getByRole('row', { name: /Right 5 of 8 3 of 8/ })).toBeVisible();
});

test('Ch 31: each ending scores 4 of 6; the format is followed once', async ({ page }) => {
	await gotoHydrated(page, '/steps-and-structure');
	const widget = page.getByRole('region', { name: 'Ask for steps, ask for a format' });
	await expect(widget.getByText(/^0\.10$/)).toBeVisible();
	await expect(
		widget.getByRole('row', { name: /Steps, then a fixed format 4 of 6 1 of 6/ })
	).toBeVisible();
});

test('Ch 32: order, layout, and position', async ({ page }) => {
	await gotoHydrated(page, '/where-prompts-break');
	const widget = page.getByRole('region', { name: 'Small changes, different answers' });
	await expect(widget.getByRole('row', { name: /8 of 8/ })).toBeVisible();
	await widget.getByLabel('Formatting').check();
	await expect(widget.getByRole('row', { name: /Sentiment.*7 of 8/ })).toBeVisible();
	await widget.getByLabel('Position in a long prompt').check();
	await expect(widget.getByText(/8 of 88 answers went wrong/)).toBeVisible();
});

test('Ch 33: zoom into the model and take the quiz', async ({ page }) => {
	await gotoHydrated(page, '/recap');
	const picture = page.getByRole('region', { name: 'The whole picture' });
	await picture.getByRole('button', { name: 'Zoom in on the model' }).click();
	await picture.getByRole('button', { name: /Zoom in on 12 transformer blocks/ }).click();
	await expect(picture.getByRole('link', { name: /Ch 9: Attention/ })).toBeVisible();
	await picture.getByRole('button', { name: 'The model' }).click();
	await picture.getByRole('button', { name: 'Zoom in on other kinds of models' }).click();
	await expect(picture.getByRole('link', { name: /Ch 26: Painting from noise/ })).toBeVisible();
	await picture.getByRole('button', { name: 'A chat app or agent' }).click();
	await picture.getByRole('button', { name: 'Zoom in on you' }).click();
	await expect(picture.getByRole('link', { name: /Ch 29: Learning from examples/ })).toBeVisible();

	const quiz = page.getByRole('region', { name: 'Quick check' });
	for (const answer of [
		'Probabilities for the next token',
		'It reads tokens, not letters',
		'It lets each token pull in information from any earlier token',
		'The harness',
		'Guardrails in the harness, like asking you first',
		'Its attention can look at the words after the blank too',
		'It writes scratch work as tokens before answering',
		'Nothing but its context: attention can copy the pattern from the examples'
	]) {
		await quiz.getByLabel(answer, { exact: true }).check();
	}
	await quiz.getByRole('button', { name: 'Check my answers' }).click();
	await expect(quiz.getByText('8 of 8 right.')).toBeVisible();
});
