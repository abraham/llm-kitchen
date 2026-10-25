import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MODEL_CACHE, pinnedUrl } from '../../src/lib/models/model-cache.ts';
import type { PinnedModel } from '../../src/lib/workers/verified-fetch.ts';
import { gotoHydrated } from './helpers.ts';

type Config = PinnedModel & { displayName: string; huggingFaceId: string; onnxMB: number };
const config = (name: string): Config =>
	JSON.parse(readFileSync(`models/${name}.json`, 'utf8')) as Config;

const canonical = config('canonical');
const encoder = config('encoder');
const clip = config('clip');
const MINILM = { ...config('embedder'), label: 'all-MiniLM-L6-v2', chapters: ['embeddings'] };
const DOWNLOADS = [
	{
		...canonical,
		label: `${canonical.displayName} (8-bit)`,
		chapters: [
			'guessing-game',
			'probability-and-sampling',
			'generating-text',
			'quirks-and-limits',
			'prompts-as-documents',
			'encoders'
		]
	},
	MINILM,
	{ ...encoder, label: `${encoder.displayName} (8-bit)`, chapters: ['encoders'] },
	{ ...clip, label: `${clip.displayName} text half (4-bit)`, chapters: ['seeing-pictures'] }
];
const RUNTIME_MB = 27;
const SMALL_MB = DOWNLOADS.reduce((a, m) => a + m.onnxMB, RUNTIME_MB);

const modelsLink = (page: Page, name: string | RegExp = 'Models: Recorded') =>
	page.getByRole('banner').getByRole('link', { name });

/** Placeholder files: enough for the cache check, without downloading the models. */
async function seedCache(page: Page, models: PinnedModel[]) {
	const urls = models.flatMap((m) => Object.keys(m.onnxFiles).map((path) => pinnedUrl(m, path)));
	await page.evaluate(
		async ({ name, urls }) => {
			const cache = await caches.open(name);
			await Promise.all(urls.map((url) => cache.put(url, new Response('placeholder'))));
		},
		{ name: MODEL_CACHE, urls }
	);
}

const cachedFiles = (page: Page) =>
	page.evaluate(
		(name) => caches.open(name).then(async (c) => (await c.keys()).length),
		MODEL_CACHE
	);

test('the app bar links to the Models page from every page, named by the tier', async ({
	page
}) => {
	for (const path of ['/', '/guessing-game']) {
		await gotoHydrated(page, path);
		const link = modelsLink(page);
		await expect(link).toHaveAttribute('href', '/downloads');
		await expect(link).not.toHaveAttribute('aria-current');
	}
	await modelsLink(page).click();
	await expect(page).toHaveURL('/downloads');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Models');
	await expect(page).toHaveTitle(/^Models and downloads/);
	await expect(modelsLink(page)).toHaveAttribute('aria-current', 'page');
});

test('offers the tiers and lists every model with its size, commit, chapters, and links', async ({
	page
}) => {
	const offSite: string[] = [];
	page.on('request', (r) => {
		if (r.url().includes('huggingface')) offSite.push(r.url());
	});
	await gotoHydrated(page, '/downloads');
	await expect(page.getByRole('radio', { name: /^Show recordings \(default\)/ })).toBeChecked();
	await expect(page.getByRole('radio', { name: /^Small/ })).toHaveAccessibleName(
		new RegExp(`^Small: about ${SMALL_MB} MB`)
	);
	await expect(page.getByRole('heading', { level: 2, name: 'Small' })).toBeVisible();
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
		// The tier choice is the only download button.
		await expect(card.getByRole('button')).toHaveCount(0);
	}
	await expect(page.getByRole('region', { name: 'ONNX Runtime' })).toContainText('27 MB');
	expect(offSite).toEqual([]);
});

test('a downloaded tier holds across pages and reloads, until a model is removed', async ({
	page
}) => {
	await gotoHydrated(page, '/downloads');
	await seedCache(page, DOWNLOADS);
	await gotoHydrated(page, '/downloads');

	await page.getByRole('radio', { name: /^Small/ }).check();
	await expect(page.getByText('The Small tier is ready')).toBeVisible();
	await expect(modelsLink(page, 'Models: Small')).toBeVisible();
	await expect(page.getByText(`Downloaded models use ${SMALL_MB - RUNTIME_MB} MB`)).toBeVisible();

	await gotoHydrated(page, '/downloads');
	await expect(page.getByRole('radio', { name: /^Small/ })).toBeChecked();
	await gotoHydrated(page, '/guessing-game');
	await expect(modelsLink(page, 'Models: Small')).toBeVisible();

	await gotoHydrated(page, '/downloads');
	const card = page.getByRole('region', { name: MINILM.label });
	await card.getByRole('button', { name: `Remove ${MINILM.label}` }).click();
	await expect(card.getByRole('status')).toHaveText('Not downloaded');
	await expect(page.getByRole('radio', { name: /^Show recordings/ })).toBeChecked();
	await expect(modelsLink(page)).toBeVisible();
	expect(await cachedFiles(page)).toBe(
		DOWNLOADS.filter((m) => m !== MINILM).reduce((a, m) => a + Object.keys(m.onnxFiles).length, 0)
	);

	await page.getByRole('button', { name: 'Remove all' }).click();
	await expect.poll(() => cachedFiles(page)).toBe(0);
});

test('a failed tier download says so on the page, in the app bar, and in widgets', async ({
	page
}) => {
	// On the context, so it covers the inference worker's requests too.
	await page.context().route('https://huggingface.co/**', (route) => route.abort());
	await gotoHydrated(page, '/downloads');
	await page.getByRole('radio', { name: /^Small/ }).check();
	await expect(page.getByRole('alert').first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Try again' }).first()).toBeVisible();
	await expect(modelsLink(page, 'Models: Small, download failed')).toBeVisible();

	// The choice stays, so the next page tries again, and its widgets stay on recordings.
	await gotoHydrated(page, '/embeddings');
	const map = page.getByRole('region', { name: 'A map of meaning' });
	await expect(map.getByText("Recorded · the Small tier didn't finish downloading")).toBeVisible();
	await expect(map.getByRole('alert')).toContainText("The Small tier didn't finish downloading");
	await expect(map.getByLabel('Your word')).toHaveCount(0);
});
