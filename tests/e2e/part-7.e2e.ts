import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

const PAGES = [
	'/the-model-is-not-the-product',
	'/tools',
	'/the-agent-loop',
	'/managing-the-context',
	'/caching',
	'/prompt-injection',
	'/trust-and-guardrails'
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

test('Ch 21: peeling back the prompt', async ({ page }) => {
	await gotoHydrated(page, '/the-model-is-not-the-product');
	const widget = page.getByRole('region', { name: 'What the model actually sees' });
	const raw = widget.getByLabel('The text sent to the model');
	await expect(raw).toHaveText('Finish this: The cat sat on the');
	await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(raw).toContainText('<|im_start|>user');
	for (let i = 0; i < 4; i++) await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(raw).toContainText('<tool_response>');
	await expect(widget.getByText('The second call: 493 tokens')).toBeVisible();
});

test('Ch 22: tools off gets it wrong, tools on gets it right', async ({ page }) => {
	await gotoHydrated(page, '/tools');
	const widget = page.getByRole('region', { name: 'Tools off, tools on' });
	await expect(widget.getByText('7,050,952').last()).toBeVisible();
	await widget.getByLabel(/Tools on/).check();
	for (let i = 0; i < 3; i++) await widget.getByRole('button', { name: 'Next →' }).click();
	await expect(widget.getByText('<call calculator>1234 * 5678</call>')).toBeVisible();
	await expect(widget.getByText('The product of 1234 and 5678 is 7006652.')).toBeVisible();
});

test('Ch 23: the agent loop ends with an answer', async ({ page }) => {
	await gotoHydrated(page, '/the-agent-loop');
	const widget = page.getByRole('region', { name: 'The agent loop' });
	const next = widget.getByRole('button', { name: 'Next →' });
	for (let i = 0; i < 4; i++) await next.click();
	await expect(widget.getByText(/contains 30 words/)).toBeVisible();
	await expect(widget.getByText(/this is the answer and the loop ends/)).toBeVisible();
});

test('Ch 24: strategies change what the model can answer', async ({ page }) => {
	await gotoHydrated(page, '/managing-the-context');
	const widget = page.getByRole('region', { name: 'The context budget' });
	await widget.getByLabel('Drop the oldest').check();
	await expect(widget.getByText(/Old Mother Hubbard/)).toBeVisible();
	await widget.getByLabel(/Retrieve/).check();
	await expect(widget.getByRole('img', { name: /task 1 is the closest/ })).toBeVisible();
	await expect(widget.locator('.answer')).toContainText('30 words');
});

test('Ch 25: the KV cache and the prompt cache', async ({ page }) => {
	await gotoHydrated(page, '/caching');
	const kv = page.getByRole('region', { name: 'Reusing keys and values' });
	for (let i = 0; i < 4; i++) await kv.getByRole('button', { name: 'Next →' }).click();
	await expect(kv.locator('.readout')).toContainText('run 35 token positions with the cache off');
	await kv.getByRole('radio', { name: 'On', exact: true }).check();
	await expect(kv.locator('.readout')).toContainText('run 9 token positions with the cache on');

	const view = page.getByRole('region', { name: 'What the provider can reuse' });
	await expect(view.getByText('6,100 (80%)')).toBeVisible();
	await view.getByLabel('Put the time at the top').check();
	await expect(view.getByText('0 (0%)')).toBeVisible();
});

test('Ch 26: an injected claim reaches the summary', async ({ page }) => {
	await gotoHydrated(page, '/prompt-injection');
	const lab = page.getByRole('region', { name: 'The prompt injection lab' });
	await expect(lab.getByText(/has been cancelled due to unforeseen circumstances/)).toBeVisible();
	await expect(lab.getByText('The attacker’s claim made it into the summary.')).toBeVisible();
	await lab
		.getByRole('button', { name: /A fake new message from you, Remove chat markers/ })
		.click();
	await lab.getByLabel('Color by source').uncheck();
	await expect(lab.locator('.note')).toContainText('with 3 role markers');
});

test('Ch 27: guardrails protect the files', async ({ page }) => {
	await gotoHydrated(page, '/trust-and-guardrails');
	const widget = page.getByRole('region', { name: 'A poisoned web page' });
	await expect(widget.getByText('taxes.pdf (deleted)')).toBeVisible();
	await widget.getByLabel('Ask before deleting').check();
	await expect(widget.getByText('taxes.pdf (deleted)')).toHaveCount(0);
	await expect(widget.getByText('blocked by the harness').first()).toBeVisible();
});
