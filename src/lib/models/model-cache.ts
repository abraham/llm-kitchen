import type { PinnedModel } from '#lib/workers/verified-fetch.ts';

/** The Cache API store that holds the live models' files, shared by the page and the worker. */
export const MODEL_CACHE = 'llm-kitchen-models';

/** Where Transformers.js cached model files before the site had its own store. */
export const OLD_CACHE = 'transformers-cache';

const HUB = 'https://huggingface.co';

/** A file's URL at its model's pinned commit, which is also its key in the cache. */
export function pinnedUrl(model: PinnedModel, path: string): string {
	return `${HUB}/${model.onnxId}/resolve/${model.onnxRevision}/${path}`;
}

/**
 * The cache key for a URL Transformers.js asks for: a listed file of a pinned model, at its pinned
 * commit whatever revision was asked for. Anything else isn't cached.
 */
export function cacheKey(url: string, models: readonly PinnedModel[]): string | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	if (parsed.origin !== HUB) return undefined;
	const [, owner, name, resolve, , ...rest] = parsed.pathname.split('/');
	const model = models.find((m) => m.onnxId === `${owner}/${name}`);
	const path = decodeURIComponent(rest.join('/'));
	if (resolve !== 'resolve' || !model || !(path in model.onnxFiles)) return undefined;
	return pinnedUrl(model, path);
}

/** The site's model store, or `null` where the browser has no Cache API or refuses it. */
export async function openModelCache(): Promise<Cache | null> {
	if (typeof caches === 'undefined') return null;
	try {
		return await caches.open(MODEL_CACHE);
	} catch {
		return null;
	}
}

/** Whether every file the model lists is in the cache. */
export async function isDownloaded(cache: Cache, model: PinnedModel): Promise<boolean> {
	for (const path of Object.keys(model.onnxFiles)) {
		if (!(await cache.match(pinnedUrl(model, path)))) return false;
	}
	return true;
}

export async function removeModel(cache: Cache, model: PinnedModel): Promise<void> {
	await Promise.all(
		Object.keys(model.onnxFiles).map((path) => cache.delete(pinnedUrl(model, path)))
	);
}

/** Deletes entries that aren't a current listed file, such as files of an older commit. */
export async function removeUnlisted(cache: Cache, models: readonly PinnedModel[]): Promise<void> {
	const listed = new Set(
		models.flatMap((m) => Object.keys(m.onnxFiles).map((path) => pinnedUrl(m, path)))
	);
	for (const request of await cache.keys()) {
		if (!listed.has(request.url)) await cache.delete(request);
	}
}
