import { asset } from '$app/paths';
import { DATASETS, parseDataset, type DataOf, type DatasetId } from './registry.ts';

export type { DataOf, DatasetId } from './registry.ts';

/** The URL of a dataset's file. */
export function datasetUrl(id: DatasetId): string {
	return asset(`/data/${DATASETS[id].file}` as Parameters<typeof asset>[0]);
}

/** Fetch and parse a dataset with the given `fetch` (SvelteKit's in a `load`, the browser's otherwise). */
export async function fetchDataset<I extends DatasetId>(
	id: I,
	fetcher: typeof fetch = fetch
): Promise<DataOf<I>> {
	const res = await fetcher(datasetUrl(id));
	if (!res.ok) throw new Error(`Could not load ${id} (${res.status})`);
	return parseDataset(id, await res.json());
}

const cache = new Map<DatasetId, Promise<unknown>>();

/** Fetch a dataset once per page view (browser only; stays pending while prerendering). */
export function loadDataset<I extends DatasetId>(id: I): Promise<DataOf<I>> {
	if (typeof window === 'undefined') return new Promise(() => {});
	let pending = cache.get(id);
	if (!pending) {
		pending = fetchDataset(id);
		pending.catch(() => cache.delete(id));
		cache.set(id, pending);
	}
	return pending as Promise<DataOf<I>>;
}
