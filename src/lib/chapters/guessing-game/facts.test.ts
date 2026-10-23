import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';

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
});
