import { describe, expect, it } from 'vitest';
import { MOE_MODELS } from '#lib/chapters/mixture-of-experts/data.ts';

describe('mixture of experts', () => {
	it('Mixtral uses about a quarter of its weights per token, DeepSeek-V3 about 6%', () => {
		const share = (name: string) => {
			const m = MOE_MODELS.find((x) => x.name === name)!;
			return m.activeParameters / m.totalParameters;
		};
		expect(share('Mixtral 8x7B')).toBeCloseTo(0.28, 2);
		expect(Math.round(share('DeepSeek-V3') * 100)).toBe(6);
	});
});
