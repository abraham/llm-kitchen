import type { DatasetId } from '#lib/datasets/registry.ts';
import type { ExtraLevel } from '#lib/levels.ts';

/** Recorded data this chapter's widgets show on first view, loaded with the page. */
export const datasets: readonly DatasetId[] = [
	'traces/quirk-moon',
	'traces/quirk-painter',
	'traces/quirk-iphone',
	'traces/quirk-math',
	'traces/quirk-france',
	'traces/quirk-france-qa',
	'traces/quirk-loop',
	'traces/quirk-nurse',
	'traces/quirk-engineer'
];

/** The levels this chapter has passages for beyond Standard. */
export const levels: readonly ExtraLevel[] = ['simple', 'deep'];
