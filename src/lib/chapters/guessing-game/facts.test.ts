import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';
import canonical from '../../../../models/canonical.json';

const trace = (name: TraceName) => readDataset(`traces/${name}`);

describe('the guessing game', () => {
	const first = trace('the-cat-sat').steps[0];

	it('"floor, bed, and couch are all likely" (the top three)', () => {
		expect(first.candidates.slice(0, 3).map((c) => c.token.text.trim())).toEqual([
			'floor',
			'bed',
			'couch'
		]);
	});

	it('"no single option gets even one chance in ten"', () => {
		expect(first.candidates[0].prob).toBeLessThan(0.1);
	});

	it('shows 4 rounds of generation, which exist in the trace', () => {
		expect(trace('the-cat-sat').steps.length).toBeGreaterThanOrEqual(4);
	});

	it('In depth: "floor gets 7.6%, and a comma after floor gets 26%", about 2% together', () => {
		const [one, two] = trace('the-cat-sat').steps;
		expect(one.chosen.text).toBe(' floor');
		expect(two.chosen.text).toBe(',');
		const p1 = one.candidates.find((c) => c.token.id === one.chosen.id)!.prob;
		const p2 = two.candidates.find((c) => c.token.id === two.chosen.id)!.prob;
		expect(p1).toBeCloseTo(0.076, 3);
		expect(Math.round(p2 * 100)).toBe(26);
		expect(Math.round(p1 * p2 * 100)).toBe(2);
	});

	it('In depth: "the 50 likeliest next tokens add up to only about 64%; the other 50,207 share the rest"', () => {
		expect(first.candidates).toHaveLength(50);
		const top = first.candidates.reduce((a, c) => a + c.prob, 0);
		expect(Math.round(top * 100)).toBe(64);
		expect(canonical.vocabularySize - 50).toBe(50_207);
	});

	it('In depth: "eight equally likely outcomes is 3 bits"', () => {
		const p = Array(8).fill(1 / 8);
		expect(-p.reduce((a, x) => a + x * Math.log2(x), 0)).toBe(3);
	});
});
