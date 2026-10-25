import type { DatasetId } from '#lib/datasets/registry.ts';
import type { ExtraLevel } from '#lib/levels.ts';

/** Recorded data this chapter's widgets show on first view, loaded with the page. */
export const datasets: readonly DatasetId[] = [
	'agent/agent-cat',
	'agent/math-tools',
	'agent/math-no-tools',
	'agent/chat',
	'agent/inject-none',
	'agent/inject-ask',
	'agent/inject-allowlist',
	'agent/grades'
];

/** The levels this chapter has passages for beyond Standard. */
export const levels: readonly ExtraLevel[] = ['simple', 'deep'];
