import { describe, expect, it } from 'vitest';
import { ALPHA_BARS, BETAS, STEPS } from '#lib/math/diffusion.ts';

describe('painting from noise', () => {
	it('in depth: 50 steps, beta from 0.001 to 0.2', () => {
		expect(STEPS).toBe(50);
		expect(BETAS[0]).toBeCloseTo(0.001, 6);
		expect(BETAS.at(-1)).toBeCloseTo(0.2, 6);
	});

	it('in depth: after 50 steps alpha-bar is about 0.0045, under 7% of the point left', () => {
		expect(ALPHA_BARS.at(-1)).toBeCloseTo(0.0045, 4);
		expect(Math.sqrt(ALPHA_BARS.at(-1)!)).toBeLessThan(0.07);
	});
});
