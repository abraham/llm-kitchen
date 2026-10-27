import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';
import canonical from '../../../../models/canonical.json';

import { encode } from 'gpt-tokenizer/encoding/gpt2';
import { textAfter } from '#lib/models/trace.ts';
import { markRepeats } from './penalty.ts';
const trace = (name: TraceName) => readDataset(`traces/${name}`);
const full = (name: TraceName) => {
	const t = trace(name);
	return textAfter(t, t.steps.length - 1) + t.steps.at(-1)!.chosen.text;
};
const top = (name: TraceName) => trace(name).steps[0].candidates;

describe('generating text', () => {
	it('greedy: "The cat sat on the floor, and the cat was still asleep."', () => {
		expect(full('the-cat-sat')).toContain(
			'The cat sat on the floor, and the cat was still asleep.'
		);
	});

	it('picking " bed" loops', () => {
		expect(full('the-cat-sat-bed')).toMatch(
			/^The cat sat on the bed, and the cat sat on the bed, and/
		);
	});

	it('the branches start from the first step’s top candidates', () => {
		const first = top('the-cat-sat').map((c) => c.token.text);
		for (const word of ['bed', 'couch', 'ground', 'edge']) expect(first).toContain(` ${word}`);
	});

	it('<|endoftext|> is token 50256', () => {
		expect(encode('<|endoftext|>', { allowedSpecial: new Set(['<|endoftext|>']) })).toEqual([
			50256
		]);
	});

	it('In depth: " edge of" (4.6%) is more than twice as likely as greedy\'s " floor," (2%)', () => {
		const chance = (name: TraceName, n: number) =>
			trace(name)
				.steps.slice(0, n)
				.map((s) => s.candidates.find((c) => c.token.id === s.chosen.id)!.prob);
		const [floor, comma] = chance('the-cat-sat', 2);
		const edge = top('the-cat-sat').find((c) => c.token.text === ' edge')!.prob;
		const [of] = chance('the-cat-sat-edge', 1);
		expect(trace('the-cat-sat-edge').steps[0].chosen.text).toBe(' of');
		expect(edge).toBeCloseTo(0.048, 3);
		expect(Math.round(of * 100)).toBe(96);
		expect(Math.round(edge * of * 1000) / 10).toBe(4.6);
		expect(Math.round(floor * comma * 100)).toBe(2);
		expect(edge * of).toBeGreaterThan(2 * floor * comma);
	});

	it('In depth: about 2 operations per weight: "about 250 million" per token, "about 124 billion" for 500', () => {
		const perToken = 2 * canonical.parameters;
		expect(Math.abs(perToken - 250e6)).toBeLessThan(2e6);
		expect(Math.round((500 * perToken) / 1e9)).toBe(124);
	});

	const distinct = (name: TraceName) =>
		markRepeats(trace(name).steps.map((s) => s.chosen.text)).filter((t) => !t.repeat).length;

	it('penalties: 32 tokens each from "The cat sat on the bed", greedy after the penalty', () => {
		for (const [name, penalty] of [
			['penalty-0', undefined],
			['penalty-05', 0.5],
			['penalty-5', 5]
		] as const) {
			const t = trace(name);
			expect(t.prompt).toBe('The cat sat on the bed');
			expect(t.steps).toHaveLength(32);
			expect(t.settings?.temperature).toBe(0);
			expect(t.settings?.frequencyPenalty).toBe(penalty);
			for (const s of t.steps) expect(s.chosen.text).toBe(s.candidates[0].token.text);
		}
	});

	it('no penalty: 7 different tokens of 32; 0.5: the phrase comes round once more, then 25; 5: all 32', () => {
		expect(distinct('penalty-0')).toBe(7);
		expect(full('penalty-05')).toMatch(/^The cat sat on the bed, and the cat sat on the bed\./);
		expect(distinct('penalty-05')).toBe(25);
		expect(distinct('penalty-5')).toBe(32);
	});

	it('penalty 5: " the" is ruled out, so the cat sits on "her back"', () => {
		expect(full('penalty-5')).toMatch(/^The cat sat on the bed, and the cat sat on her back/);
	});
});
