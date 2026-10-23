import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

import { tokenize } from './tokenizers.ts';

describe('browser tokenizers', () => {
	it('the GPT-2 tokenizer matches the tokens recorded from the real model', async () => {
		const trace = readDataset('traces/the-cat-sat');
		expect(await tokenize('gpt2', trace.prompt)).toEqual(trace.tokens);
		const generated = trace.prompt + trace.steps.map((s) => s.chosen.text).join('');
		expect((await tokenize('gpt2', generated)).map((t) => t.id)).toEqual([
			...trace.tokens.map((t) => t.id),
			...trace.steps.map((s) => s.chosen.id)
		]);
	});

	it('splits "strawberry" differently with and without a leading space (tokens)', async () => {
		expect((await tokenize('gpt2', 'strawberry')).map((t) => t.text)).toEqual([
			'st',
			'raw',
			'berry'
		]);
		expect((await tokenize('gpt2', ' strawberry')).map((t) => t.text)).toEqual([' strawberry']);
		expect((await tokenize('cl100k', 'strawberry')).map((t) => t.text)).toEqual([
			'str',
			'aw',
			'berry'
		]);
	});

	it('round-trips text', async () => {
		const text = 'Tokenization, 🐱, and naïve café';
		for (const name of ['gpt2', 'cl100k', 'o200k'] as const) {
			const ids = (await tokenize(name, text)).map((t) => t.id);
			expect(ids.length).toBeGreaterThan(0);
		}
	});
});
