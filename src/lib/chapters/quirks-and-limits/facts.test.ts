import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type TraceName } from '#lib/datasets/registry.ts';

import { encode } from 'gpt-tokenizer/encoding/gpt2';
import { textAfter } from '#lib/models/trace.ts';
import { tokenize } from '#lib/models/tokenizers.ts';
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

	it('nurse: " she" 14.9%, " he" 2.9% (about five times); engineer: " he" 6.9%, " she" 0.8% (over eight)', () => {
		const pct = (name: TraceName, t: string) =>
			Math.round(top(name).find((x) => x.token.text === t)!.prob * 1000) / 10;
		expect([pct('quirk-nurse', ' she'), pct('quirk-nurse', ' he')]).toEqual([14.9, 2.9]);
		expect([pct('quirk-engineer', ' he'), pct('quirk-engineer', ' she')]).toEqual([6.9, 0.8]);
		const ratio = (name: TraceName, a: string, b: string) => {
			const c = top(name);
			return c.find((x) => x.token.text === a)!.prob / c.find((x) => x.token.text === b)!.prob;
		};
		expect(Math.round(ratio('quirk-nurse', ' she', ' he'))).toBe(5);
		expect(ratio('quirk-engineer', ' he', ' she')).toBeGreaterThan(8);
	});

	it('" strawberry" is one token, "strawberry" three', () => {
		expect(encode(' strawberry')).toHaveLength(1);
		expect(encode('strawberry')).toHaveLength(3);
	});

	it('In depth: GPT-2 splits " 2023" as " 20" + "23"; GPT-4 cuts numbers into groups of three from the left', async () => {
		const texts = async (name: 'gpt2' | 'cl100k', s: string) =>
			(await tokenize(name, s)).map((t) => t.text);
		expect(await texts('gpt2', ' 2023')).toEqual([' 20', '23']);
		expect(await texts('gpt2', ' 1234567')).toEqual([' 123', '45', '67']);
		expect((await texts('cl100k', ' 2023')).filter((t) => t.trim())).toEqual(['202', '3']);
		expect((await texts('cl100k', ' 1234567')).filter((t) => t.trim())).toEqual([
			'123',
			'456',
			'7'
		]);
	});
});
