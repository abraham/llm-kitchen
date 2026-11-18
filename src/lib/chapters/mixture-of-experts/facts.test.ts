import { describe, expect, it } from 'vitest';
import { MIXTRAL, MOE_MODELS } from '#lib/chapters/mixture-of-experts/data.ts';
import { weightBytes } from '#lib/math/quantize.ts';
import { Router } from '#lib/math/router.ts';
import { softmax } from '#lib/math/sampling.ts';

describe('mixture of experts', () => {
	it('Mixtral uses about a quarter of its weights per token, DeepSeek-V3 about 6%', () => {
		const share = (name: string) => {
			const m = MOE_MODELS.find((x) => x.name === name)!;
			return m.activeParameters / m.totalParameters;
		};
		expect(share('Mixtral 8x7B')).toBeCloseTo(0.28, 2);
		expect(Math.round(share('DeepSeek-V3') * 100)).toBe(6);
	});

	it('in depth: S + 8E = 47 and S + 2E = 13 give about 5.7 billion per expert, 1.7 shared', () => {
		const m = MOE_MODELS.find((x) => x.name === 'Mixtral 8x7B')!;
		const expert = (m.totalParameters - m.activeParameters) / 6;
		const shared = m.activeParameters - 2 * expert;
		expect((expert / 1e9).toFixed(1)).toBe('5.7');
		expect((shared / 1e9).toFixed(1)).toBe('1.7');
	});

	it('Mixtral needs room for all 47 billion: about 94 GB at 16 bits and 24 GB at 4', () => {
		const m = MOE_MODELS.find((x) => x.name === 'Mixtral 8x7B')!;
		expect(Math.round(weightBytes(m.totalParameters, 16) / 1e9)).toBe(94);
		expect(Math.round(weightBytes(m.totalParameters, 4) / 1e9)).toBe(24);
	});

	it('in depth: at 4 bits, 0.8 GB shared; 89 MB per expert per block; 64 per token, 5.7 GB', () => {
		const m = MOE_MODELS.find((x) => x.name === 'Mixtral 8x7B')!;
		const expert = (m.totalParameters - m.activeParameters) / 6;
		const shared = m.activeParameters - 2 * expert;
		const one = expert / MIXTRAL.blocks;
		const used = MIXTRAL.blocks * MIXTRAL.perToken;
		expect((weightBytes(shared, 4) / 1e9).toFixed(1)).toBe('0.8');
		expect((one / 1e9).toFixed(2)).toBe('0.18');
		expect(Math.round(weightBytes(one, 4) / 1e6)).toBe(89);
		expect(used).toBe(64);
		const perToken = weightBytes(used * one, 4);
		expect((perToken / 1e9).toFixed(1)).toBe('5.7');
		const whole = weightBytes(m.totalParameters, 4);
		expect(perToken / whole).toBeGreaterThan(0.23);
		expect(perToken / whole).toBeLessThan(0.25);
		expect((perToken / 10 / 1e9).toFixed(2)).toBe('0.57');
	});

	it('in depth: rescaling the top k of a full softmax equals a softmax over the top k', () => {
		const router = new Router(8, 4, 3);
		const route = router.route([0.3, -1.2, 0.8, 0.1], 2);
		const logits = route.chosen.map((e) => Math.log(route.probs[e]));
		expect(route.weights).toEqual(softmax(logits).map((w) => expect.closeTo(w, 12)));
	});
});
