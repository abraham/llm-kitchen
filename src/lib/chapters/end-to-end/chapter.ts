import type { DatasetId } from '#lib/datasets/registry.ts';

/** Recorded data this chapter's widgets show on first view, loaded with the page. */
export const datasets: readonly DatasetId[] = [
	'agent/chat',
	'traces/the-cat-sat',
	'vectors/the-cat-sat',
	'caching/kv-cache'
];
