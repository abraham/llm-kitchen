import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';

import { encode } from 'gpt-tokenizer/encoding/gpt2';
import { textAfter } from '#lib/models/trace.ts';
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
});
