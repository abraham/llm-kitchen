import { describe, expect, it } from 'vitest';
import { niceTicks, scaleLinear, scaleLog } from './scale.ts';

describe('niceTicks', () => {
	it('steps by 1, 2, or 5 times a power of ten', () => {
		expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
		expect(niceTicks(0, 1, 4)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
		expect(niceTicks(1.25, 7, 6)).toEqual([2, 3, 4, 5, 6, 7]);
		expect(niceTicks(-3, 3, 3)).toEqual([-2, 0, 2]);
		expect(niceTicks(0, 100, 2)).toEqual([0, 50, 100]);
	});

	it('handles an empty or reversed domain', () => {
		expect(niceTicks(5, 5)).toEqual([5]);
		expect(niceTicks(5, 1)).toEqual([5]);
	});
});

describe('scaleLinear', () => {
	const s = scaleLinear([0, 10], [100, 300]);

	it('maps the domain onto the range and back', () => {
		expect(s(0)).toBe(100);
		expect(s(5)).toBe(200);
		expect(s(12)).toBe(340);
		expect(s.invert(250)).toBe(7.5);
	});

	it('works with an inverted range, as a y axis is', () => {
		const y = scaleLinear([0, 1], [200, 0]);
		expect(y(0.25)).toBe(150);
		expect(y.invert(50)).toBe(0.75);
		expect(y.ticks(2)).toEqual([0, 0.5, 1]);
	});
});

describe('scaleLog', () => {
	const s = scaleLog([1e3, 1e12], [0, 900]);

	it('spaces powers of ten evenly', () => {
		expect(s(1e3)).toBe(0);
		expect(s(1e6)).toBeCloseTo(300);
		expect(s.invert(600)).toBeCloseTo(1e9);
	});

	it('ticks at powers of ten, thinned to about the count asked for', () => {
		expect(s.ticks(10)).toEqual([1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12]);
		expect(s.ticks(4)).toEqual([1e3, 1e6, 1e9, 1e12]);
	});

	it('rejects a domain that includes zero', () => {
		expect(() => scaleLog([0, 10], [0, 1])).toThrow();
	});
});
