import { describe, expect, it } from 'vitest';
import {
	ASSISTANT_LIVE,
	BERT_LIVE,
	CANONICAL_LIVE,
	CLIP_TEXT,
	DOWNLOADS,
	MINILM
} from './downloads.ts';
import { RUNTIME_MB } from './onnx-runtime.ts';
import { parseTier, tier, tierMB, tierModels, TIERS, type Capability } from './tiers.ts';

/** The kinds of task the widgets with a live option ask for. */
const USED: Capability[] = ['next-token', 'embed', 'fill-mask', 'image-text', 'chat'];

describe('tiers', () => {
	it('starts with Recorded, which downloads nothing', () => {
		expect(TIERS[0].id).toBe('recorded');
		expect(tierModels(tier('recorded'))).toEqual([]);
		expect(tierMB(tier('recorded'))).toBe(0);
	});

	it('covers every kind of task a widget asks for in Large, with a downloadable model', () => {
		const large = tier('large');
		for (const capability of USED) {
			const model = large.covers[capability];
			expect(model, capability).toBeDefined();
			expect(DOWNLOADS).toContain(model);
			expect(model?.task).toBe(capability);
		}
		expect(tier('small').covers.chat).toBeUndefined();
	});

	it('makes Large a superset of Small', () => {
		for (const model of tierModels(tier('small'))) {
			expect(tierModels(tier('large'))).toContain(model);
		}
	});

	it('sizes a tier as its models plus the runtime once (about 419 MB and 1.2 GB)', () => {
		const small = [CANONICAL_LIVE, MINILM, BERT_LIVE, CLIP_TEXT];
		expect(tierModels(tier('small'))).toEqual(small);
		expect(tierMB(tier('small'))).toBe(small.reduce((a, m) => a + m.modelMB, RUNTIME_MB));
		expect(tierMB(tier('small'))).toBe(419);
		expect(tierModels(tier('large'))).toEqual([...small, ASSISTANT_LIVE]);
		expect(tierMB(tier('large'))).toBe(419 + ASSISTANT_LIVE.modelMB);
		expect((tierMB(tier('large')) / 1000).toFixed(1)).toBe('1.2');
	});

	it('reads anything but a known tier as Recorded', () => {
		expect(parseTier('small')).toBe('small');
		expect(parseTier('large')).toBe('large');
		for (const raw of [null, undefined, '', 'huge', 'SMALL', '__proto__', 'recorded']) {
			expect(parseTier(raw)).toBe('recorded');
		}
	});
});
