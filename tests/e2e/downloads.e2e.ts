import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MODEL_CACHE, pinnedUrl } from '../../src/lib/models/model-cache.ts';
import type { PinnedModel } from '../../src/lib/workers/verified-fetch.ts';
import { gotoHydrated } from './helpers.ts';

type Config = PinnedModel & { displayName: string; huggingFaceId: string; onnxMB: number };
const config = (name: string): Config =>
	JSON.parse(readFileSync(`models/${name}.json`, 'utf8')) as Config;

const canonical = config('canonical');
const MINILM = { ...config('embedder'), label: 'all-MiniLM-L6-v2', chapters: ['embeddings'] };
const DOWNLOADS = [
	{
		...canonical,
		label: `${canonical.displayName} (8-bit)`,
		chapters: ['generating-text', 'quirks-and-limits', 'prompts-as-documents']
	},
	MINILM
];

test('the app bar links to the downloads page from every page', async ({ page }) => {
	for (const path of ['/', '/guessing-game']) {
		await gotoHydrated(page, path);
		const link = page.getByRole('banner').getByRole('link', { name: 'Downloads' });
		await expect(link).toHaveAttribute('href', '/downloads');
		await expect(link).not.toHaveAttribute('aria-current');
	}
	await page.getByRole('banner').getByRole('link', { name: 'Downloads' }).click();
	await expect(page).toHaveURL('/downloads');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Downloads');
	await expect(page.getByRole('banner').getByRole('link', { name: 'Downloads' })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test('lists every model with its size, commit, chapters, state, and Hugging Face links', async ({
	page
}) => {
	const offSite: string[] = [];
	page.on('request', (r) => {
		if (r.url().includes('huggingface')) offSite.push(r.url());
	});
	await gotoHydrated(page, '/downloads');
	for (const model of DOWNLOADS) {
		const card = page.getByRole('region', { name: model.label });
		await expect(card).toContainText(`${model.onnxMB} MB`);
		await expect(card).toContainText(model.onnxRevision.slice(0, 7));
		await expect(card.getByRole('status')).toHaveText('Not downloaded');
		await expect(card.getByRole('link', { name: 'Original model' })).toHaveAttribute(
			'href',
			`https://huggingface.co/${model.huggingFaceId}`
		);
		await expect(card.getByRole('link', { name: 'Files used here' })).toHaveAttribute(
			'href',
			`https://huggingface.co/${model.onnxId}/tree/${model.onnxRevision}`
		);
		for (const slug of model.chapters) {
			await expect(card.locator(`a[href="/${slug}"]`)).toHaveCount(1);
		}
		await expect(card.getByRole('button', { name: `Download ${model.label}` })).toBeEnabled();
	}
	await expect(page.getByRole('region', { name: 'ONNX Runtime' })).toContainText('27 MB');
	expect(offSite).toEqual([]);
});

test('a downloaded model shows as downloaded on the page and in its widget, until removed', async ({
	page
}) => {
	await gotoHydrated(page, '/downloads');
	// Placeholder files: enough for the cache check, without downloading the model.
	const urls = Object.keys(MINILM.onnxFiles).map((path) => pinnedUrl(MINILM, path));
	await page.evaluate(
		async ({ name, urls }) => {
			const cache = await caches.open(name);
			await Promise.all(urls.map((url) => cache.put(url, new Response('placeholder'))));
		},
		{ name: MODEL_CACHE, urls }
	);

	await gotoHydrated(page, '/downloads');
	const card = page.getByRole('region', { name: MINILM.label });
	await expect(card.getByRole('status')).toHaveText('Downloaded');
	await expect(page.getByText(`Downloaded models use ${MINILM.onnxMB} MB`)).toBeVisible();

	await gotoHydrated(page, '/embeddings');
	const map = page.getByRole('region', { name: 'A map of meaning' });
	await map.getByRole('button', { name: 'Add your own words…' }).click();
	await expect(map.getByRole('button', { name: 'Run it (already downloaded)' })).toBeVisible();

	await map.getByRole('link', { name: 'Manage downloads' }).click();
	await expect(page).toHaveURL('/downloads');
	await card.getByRole('button', { name: `Remove ${MINILM.label}` }).click();
	await expect(card.getByRole('status')).toHaveText('Not downloaded');
	expect(
		await page.evaluate(
			(name) => caches.open(name).then(async (c) => (await c.keys()).length),
			MODEL_CACHE
		)
	).toBe(0);

	await gotoHydrated(page, '/embeddings');
	await map.getByRole('button', { name: 'Add your own words…' }).click();
	await expect(map.getByRole('button', { name: /Download about 51 MB and run it/ })).toBeVisible();
});
