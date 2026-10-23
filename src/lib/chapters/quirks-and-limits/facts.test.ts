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

describe('quirks and limits', () => {
	it('"a man named John, who was born in 1829."', () => {
		expect(full('quirk-moon')).toContain('a man named John, who was born in 1829.');
	});

	it('latest iPhone: top guesses 6, 5, 7', () => {
		expect(
			top('quirk-iphone')
				.slice(0, 3)
				.map((c) => c.token.text)
		).toEqual([' 6', ' 5', ' 7']);
	});

	it('after "2 + 2 =", " 3" is more likely than " 4"', () => {
		const c = top('quirk-math');
		const prob = (t: string) => c.find((x) => x.token.text === t)!.prob;
		expect(prob(' 3')).toBeGreaterThan(prob(' 4'));
	});

	it('the plain France prompt rambles; the Q/A version says Paris', () => {
		expect(full('quirk-france')).toContain('the capital of the French Republic');
		expect(full('quirk-france-qa')).toContain('A: The capital of France is Paris.');
	});

	it('" strawberry" is one token, "strawberry" three', () => {
		expect(encode(' strawberry')).toHaveLength(1);
		expect(encode('strawberry')).toHaveLength(3);
	});
});
