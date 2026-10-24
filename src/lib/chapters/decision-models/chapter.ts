import type { DatasetId } from '#lib/datasets/registry.ts';
import type { ExtraLevel } from '#lib/levels.ts';

/** Recorded data this chapter's widgets show on first view, loaded with the page. */
export const datasets: readonly DatasetId[] = ['decisions/grid'];

/** The levels this chapter has passages for beyond Standard. */
export const levels: readonly ExtraLevel[] = ['simple', 'deep'];
