import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers.ts';

for (const path of ['/text-is-numbers', '/tokens', '/embeddings']) {
	test(`${path} loads its widgets and has no axe violations`, async ({ page }) => {
		await gotoHydrated(page, path);
		await expect(page.getByText(/Loading/)).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
	});
}

test('Ch 4: the GPT-2 tokenizer splits text and compares with other tokenizers', async ({
	page
}) => {
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

test('Ch 4: BPE merges e+s first, then es+t', async ({ page }) => {
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

test('Ch 5: tokens become vectors, and the map shows neighbors and the analogy', async ({
	page
}) => {
	await gotoHydrated(page, '/embeddings');
	const vectors = page.getByRole('region', { name: 'From token to vector' });
	await vectors.getByRole('button', { name: 'Next →' }).click();
	await expect(
		vectors.getByRole('img', { name: /Vector for cat: a list of 768 numbers/ })
	).toBeVisible();

	const map = page.getByRole('region', { name: 'A map of meaning' });
	await expect(map.getByText(/Nearest to cat/)).toContainText('kitten');
	await map.getByLabel('Word', { exact: true }).selectOption('paris');
	await expect(map.getByText(/Nearest to paris/)).toContainText('france');
	await map.getByLabel('Show king − man + woman').check();
	await expect(map.getByText(/lands closest to/)).toContainText('queen');

	// The live option asks before downloading anything.
	await map.getByRole('button', { name: 'Add your own words…' }).click();
	await expect(map.getByRole('button', { name: /Download about 50 MB and run it/ })).toBeVisible();
});

test('Ch 3: é takes two bytes and 🐱 takes four', async ({ page }) => {
	await gotoHydrated(page, '/text-is-numbers');
	await page.getByLabel('Type anything').fill('é🐱');
	await page.getByLabel('UTF-8 bytes').check();
	await expect(page.getByText('2 characters, 6 bytes.')).toBeVisible();
	await expect(page.getByText('C3 A9')).toBeVisible();
	await expect(page.getByText('F0 9F 90 B1')).toBeVisible();
});
