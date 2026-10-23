import { describe, expect, it } from 'vitest';
import { levels, weightBytes } from './quantize.ts';

describe('weightBytes', () => {
	it('matches the numbers in quantization', () => {
		expect(Math.round(weightBytes(124_439_808, 32) / 1e6)).toBe(498);
		expect(Math.round(weightBytes(124_439_808, 16) / 1e6)).toBe(249);
		expect(weightBytes(405e9, 16) / 1e9).toBe(810);
		expect(Math.round(weightBytes(405e9, 4) / 1e9)).toBe(203);
	});
});

describe('levels', () => {
	it('allows 2^bits values, from -(top + 1) to top times the scale', () => {
		expect([8, 4, 2].map((b) => levels(b, 1).length)).toEqual([256, 16, 4]);
		const four = levels(4, 0.7);
		expect(four.at(-1)).toBeCloseTo(0.7);
		expect(four[0]).toBeCloseTo(-0.8);
		expect(four).toContain(0);
	});
});
