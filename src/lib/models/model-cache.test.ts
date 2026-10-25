import { describe, expect, it } from 'vitest';
import { DOWNLOADS, MINILM } from './downloads.ts';
import { cacheKey, isDownloaded, pinnedUrl, removeModel, removeUnlisted } from './model-cache.ts';

/** Just enough of the Cache API, keyed by URL. */
function fakeCache(urls: string[] = []): Cache {
	const entries = new Map(urls.map((url) => [url, new Response('x')]));
	const url = (r: RequestInfo | URL) => (r instanceof Request ? r.url : String(r));
	return {
		match: async (r: RequestInfo | URL) => entries.get(url(r)),
		delete: async (r: RequestInfo | URL) => entries.delete(url(r)),
		keys: async () => [...entries.keys()].map((u) => new Request(u))
	} as unknown as Cache;
}

const files = (model: typeof MINILM) =>
	Object.keys(model.onnxFiles).map((path) => pinnedUrl(model, path));

describe('model cache', () => {
	const hub = `https://huggingface.co/${MINILM.onnxId}/resolve`;

	it('keys a listed file by its pinned URL, whatever revision was asked for', () => {
		const pinned = pinnedUrl(MINILM, 'config.json');
		expect(pinned).toBe(`${hub}/${MINILM.onnxRevision}/config.json`);
		expect(cacheKey(`${hub}/main/config.json`, DOWNLOADS)).toBe(pinned);
		expect(cacheKey(pinned, DOWNLOADS)).toBe(pinned);
		expect(cacheKey(`${hub}/main/onnx/model_quantized.onnx`, DOWNLOADS)).toBe(
			pinnedUrl(MINILM, 'onnx/model_quantized.onnx')
		);
	});

	it('refuses unlisted files, other repositories, other hosts, and local paths', () => {
		expect(cacheKey(`${hub}/main/onnx/model.onnx`, DOWNLOADS)).toBeUndefined();
		expect(
			cacheKey('https://huggingface.co/someone/else/resolve/main/config.json', DOWNLOADS)
		).toBeUndefined();
		expect(
			cacheKey(`https://example.com/${MINILM.onnxId}/resolve/main/config.json`, DOWNLOADS)
		).toBeUndefined();
		expect(cacheKey(`/models/${MINILM.onnxId}/config.json`, DOWNLOADS)).toBeUndefined();
	});

	it('counts a model as downloaded only when every listed file is cached', async () => {
		const all = files(MINILM);
		expect(await isDownloaded(fakeCache(all), MINILM)).toBe(true);
		expect(await isDownloaded(fakeCache(all.slice(1)), MINILM)).toBe(false);
		expect(await isDownloaded(fakeCache(), MINILM)).toBe(false);
	});

	it('removes a model, and cleans up only entries that are not current files', async () => {
		const old = `${hub}/0000000000000000000000000000000000000000/config.json`;
		const cache = fakeCache([...DOWNLOADS.flatMap(files), old]);
		await removeUnlisted(cache, DOWNLOADS);
		expect(await cache.match(old)).toBeUndefined();
		for (const model of DOWNLOADS) expect(await isDownloaded(cache, model)).toBe(true);

		await removeModel(cache, MINILM);
		expect(await isDownloaded(cache, MINILM)).toBe(false);
		expect(await isDownloaded(cache, DOWNLOADS[0])).toBe(true);
	});
});
