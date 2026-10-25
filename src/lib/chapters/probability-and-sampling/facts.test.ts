import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';
import canonical from '../../../../models/canonical.json';
import { applyTemperature, softmax, topP } from '#lib/math/sampling.ts';
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

	it('In depth: "at T = 1 the probabilities come out unchanged"; near 0, the top score takes it all', () => {
		const probs = trace('the-cat-sat')
			.steps[0].candidates.slice(0, 6)
			.map((c) => c.prob);
		const total = probs.reduce((a, b) => a + b, 0);
		softmax(probs.map(Math.log), 1).forEach((p, i) => expect(p).toBeCloseTo(probs[i] / total, 12));
		expect(softmax(probs.map(Math.log), 0.001)[0]).toBeCloseTo(1, 6);
	});

	it('"In the widget, top-p 0.5 keeps four words, floor, bed, couch, and ground, whose chances add up to 58%"', () => {
		const ten = trace('the-cat-sat').steps[0].candidates.slice(0, 10);
		const total = ten.reduce((a, c) => a + c.prob, 0);
		const words = ten.map((c) => ({ item: c.token.text, p: c.prob / total }));
		const kept = topP(words, 0.5).map((w) => w.item);
		expect(kept).toEqual([' floor', ' bed', ' couch', ' ground']);
		const sum = words.filter((w) => kept.includes(w.item)).reduce((a, w) => a + w.p, 0);
		expect(Math.round(sum * 100)).toBe(58);
	});
});
