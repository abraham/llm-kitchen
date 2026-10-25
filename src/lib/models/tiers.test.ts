import { describe, expect, it } from 'vitest';
import { CANONICAL_LIVE, DOWNLOADS, MINILM } from './downloads.ts';
import { RUNTIME_MB } from './onnx-runtime.ts';
import { parseTier, tier, tierMB, tierModels, TIERS, type Capability } from './tiers.ts';

/** The kinds of task the widgets with a live option ask for. */
const USED: Capability[] = ['next-token', 'embed'];

describe('tiers', () => {
	it('starts with Recorded, which downloads nothing', () => {
		expect(TIERS[0].id).toBe('recorded');
		expect(tierModels(tier('recorded'))).toEqual([]);
		expect(tierMB(tier('recorded'))).toBe(0);
	});

	it('covers every kind of task a widget asks for, with a downloadable model', () => {
		const small = tier('small');
		for (const capability of USED) {
			const model = small.covers[capability];
			expect(model, capability).toBeDefined();
			expect(DOWNLOADS).toContain(model);
		}
	});

	it('sizes a tier as its models plus the runtime once', () => {
		expect(tierModels(tier('small'))).toEqual([CANONICAL_LIVE, MINILM]);
		expect(tierMB(tier('small'))).toBe(CANONICAL_LIVE.modelMB + MINILM.modelMB + RUNTIME_MB);
	});

	it('reads anything but a known tier as Recorded', () => {
		expect(parseTier('small')).toBe('small');
		for (const raw of [null, undefined, '', 'large', 'SMALL', '__proto__', 'recorded']) {
			expect(parseTier(raw)).toBe('recorded');
		}
	});
});
