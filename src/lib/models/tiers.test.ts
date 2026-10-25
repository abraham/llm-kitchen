import { describe, expect, it } from 'vitest';
import { BERT_LIVE, CANONICAL_LIVE, CLIP_TEXT, DOWNLOADS, MINILM } from './downloads.ts';
import { RUNTIME_MB } from './onnx-runtime.ts';
import { parseTier, tier, tierMB, tierModels, TIERS, type Capability } from './tiers.ts';

/** The kinds of task the widgets with a live option ask for. */
const USED: Capability[] = ['next-token', 'embed', 'fill-mask', 'image-text'];

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
			expect(model?.task).toBe(capability);
		}
	});

	it('sizes a tier as its models plus the runtime once (about 419 MB for Small)', () => {
		const models = [CANONICAL_LIVE, MINILM, BERT_LIVE, CLIP_TEXT];
		expect(tierModels(tier('small'))).toEqual(models);
		expect(tierMB(tier('small'))).toBe(models.reduce((a, m) => a + m.modelMB, RUNTIME_MB));
		expect(tierMB(tier('small'))).toBe(419);
	});

	it('reads anything but a known tier as Recorded', () => {
		expect(parseTier('small')).toBe('small');
		for (const raw of [null, undefined, '', 'large', 'SMALL', '__proto__', 'recorded']) {
			expect(parseTier(raw)).toBe('recorded');
		}
	});
});
