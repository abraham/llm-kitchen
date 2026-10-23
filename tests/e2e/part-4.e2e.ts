import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

for (const path of ['/the-context-problem', '/attention', '/the-transformer-block']) {
	test(`${path} loads its widgets and has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByText(/Loading/)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 8: widening the window brings the referents into view', async ({ page }) => {
	await gotoHydrated(page, '/the-context-problem');
	const widget = page.getByRole('region', { name: 'How far back can it see?' });
	await expect(widget.getByText('Misses “trophy”')).toBeVisible();
	await widget.getByRole('button', { name: 'whole sentence' }).click();
	await expect(widget.getByText('“it” is the trophy')).toBeVisible();
	await widget.getByLabel('too small').check();
	await expect(widget.getByText('“it” is the suitcase')).toBeVisible();
});

test('Ch 9: attention steps and the GPT-2 viewer', async ({ page }) => {
	await gotoHydrated(page, '/attention');
	const qkv = page.getByRole('region', { name: 'Queries, keys, and values' });
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await expect(qkv.getByRole('table')).toContainText('—');
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await qkv.getByRole('button', { name: 'Next →' }).click();
	await expect(qkv.getByText('new “it”')).toBeVisible();

	const viewer = page.getByRole('region', { name: 'Who looks at whom' });
	const readout = viewer.locator('.readout');
	await expect(readout).toContainText('Layer 9, head 9');
	await expect(readout).toContainText('Mary');
	await viewer.getByLabel('Sentence').selectOption('attn-mary-lamb');
	await expect(readout).toContainText('Layer 9, head 0');
	await expect(readout).toContainText('lamb');
	await viewer.getByRole('button', { name: '·lamb' }).click();
	await expect(readout).toContainText('“·lamb” looks most at');
});

test('Ch 10: the block builder adds up to GPT-2 small, and the logit lens reads each block', async ({
	page
}) => {
	await gotoHydrated(page, '/the-transformer-block');
	const builder = page.getByRole('region', { name: 'Build a transformer' });
	for (let i = 0; i < 5; i++) await builder.getByRole('button', { name: 'Next →' }).click();
	await expect(builder.getByText('= GPT-2 small’s 124,439,808')).toBeVisible();

	const stream = page.getByRole('region', { name: 'Watch the guess form' });
	const slider = stream.getByLabel(/Read the stream/);
	await slider.fill('3');
	await expect(stream.locator('.readout')).toContainText('·same');
	await slider.fill('12');
	await expect(stream.locator('.readout')).toContainText('·floor');
});
