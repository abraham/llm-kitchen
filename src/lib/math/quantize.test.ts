import { describe, expect, it } from 'vitest';
import {
	annotateWeightBits,
	float16Parts,
	float32Parts,
	formatWeight,
	levels,
	quantizedIntCode,
	weightBytes
} from './quantize.ts';

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

describe('annotateWeightBits', () => {
	it('splits IEEE 754 float32 and float16 into 1+8+23 and 1+5+10 bits', () => {
		const f32 = float32Parts(-0.5);
		expect(f32).toEqual({
			sign: '1',
			exponent: '01111110',
			fraction: '00000000000000000000000',
			bits: '10111111000000000000000000000000'
		});
		const f16 = float16Parts(-0.5);
		expect(f16).toEqual({
			sign: '1',
			exponent: '01110',
			fraction: '0000000000',
			bits: '1011100000000000'
		});
		expect(formatWeight(-0)).toBe('0.00000');
		expect(formatWeight(-0.47385)).toBe('−0.47385');
	});

	it('produces 32 kept bits at 32-bit, 16 kept + 16 dropped at 16-bit, and signed q at 4-bit', () => {
		const w = -0.47385;
		const f32Fields = annotateWeightBits(
			w,
			w,
			{ bits: 32, kind: 'float', label: '32-bit' },
			0.68907,
			32,
			16
		);
		expect(f32Fields.reduce((a, f) => a + f.count, 0)).toBe(32);
		expect(f32Fields.some((f) => f.dropped)).toBe(false);

		const f16Fields = annotateWeightBits(
			w,
			-0.47388,
			{ bits: 16, kind: 'float', label: '16-bit' },
			0.68907,
			32,
			16
		);
		expect(f16Fields.filter((f) => !f.dropped).reduce((a, f) => a + f.count, 0)).toBe(16);
		expect(f16Fields.filter((f) => f.dropped).reduce((a, f) => a + f.count, 0)).toBe(16);

		const { q, bitString } = quantizedIntCode(w, 4, 0.68907);
		expect(q).toBe(-5);
		expect(bitString).toBe('1011');

		const intFields = annotateWeightBits(
			-0.01917,
			0,
			{ bits: 4, kind: 'int', label: '4-bit' },
			0.68907,
			32,
			16
		);
		expect(intFields.find((f) => f.id === 'int-val')?.summary).toContain(
			'rounded all the way to 0'
		);
	});
});
