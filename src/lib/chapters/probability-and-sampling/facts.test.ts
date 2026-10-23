import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';
import canonical from '../../../../models/canonical.json';
import { applyTemperature, softmax } from '#lib/math/sampling.ts';
const trace = (name: TraceName) => readDataset(`traces/${name}`);

describe('probability and sampling', () => {
	it('"the real model chooses from all 50,257 options"', () => {
		expect(canonical.vocabularySize).toBe(50257);
	});

	it('"16 more pieces of text, at three temperatures"', () => {
		for (const name of ['the-cat-sat-t00', 'the-cat-sat-t07', 'the-cat-sat-t15'] as const) {
			expect(trace(name).steps).toHaveLength(16);
		}
		expect(trace('the-cat-sat-t07').settings?.temperature).toBe(0.7);
		expect(trace('the-cat-sat-t15').settings?.temperature).toBe(1.5);
	});

	it('the widget has GPT-2’s ten most likely next words to show', () => {
		expect(trace('the-cat-sat').steps[0].candidates.length).toBeGreaterThanOrEqual(10);
	});

	it('dividing scores (log probabilities) by T gives the same chances as the temperature widget', () => {
		const probs = trace('the-cat-sat')
			.steps[0].candidates.slice(0, 6)
			.map((c) => c.prob);
		const scores = probs.map(Math.log);
		for (const t of [0.3, 1, 1.7]) {
			const divided = softmax(scores, t);
			applyTemperature(probs, t).forEach((p, i) => expect(divided[i]).toBeCloseTo(p, 12));
			// "top is e^(gap / T) times as likely as the second"
			expect(divided[0] / divided[1]).toBeCloseTo(Math.exp((scores[0] - scores[1]) / t), 10);
		}
		// Adding the same constant to every score (GPT-2's real raw scores) changes nothing.
		const shifted = softmax(
			scores.map((s) => s + 42),
			0.7
		);
		softmax(scores, 0.7).forEach((p, i) => expect(shifted[i]).toBeCloseTo(p, 12));
	});
});
