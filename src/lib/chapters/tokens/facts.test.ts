import ranks from 'gpt-tokenizer/bpeRanks/r50k_base';
import { decode, encode } from 'gpt-tokenizer/encoding/r50k_base';
import { encode as encodeGpt4 } from 'gpt-tokenizer/encoding/cl100k_base';
import { encode as encodeGpt4o } from 'gpt-tokenizer/encoding/o200k_base';
import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import canonical from '../../../../models/canonical.json';

describe('tokens', () => {
	it('"the six nursery rhymes are 145 words and 195 GPT-2 tokens, about 1.3 tokens per word"', () => {
		const words = RHYMES.reduce((n, r) => n + r.text.split(/\s+/).length, 0);
		const tokens = RHYMES.map((r) => encode(r.text));
		const count = tokens.reduce((n, t) => n + t.length, 0);
		expect([RHYMES.length, words, count]).toEqual([6, 145, 195]);
		expect((count / words).toFixed(1)).toBe('1.3');
		// Punctuation gets tokens of its own.
		expect(tokens.flat().map((t) => decode([t]))).toContain(',');
	});
	it('"256 bytes, 50,000 merges, and one end-of-text token" make GPT-2\'s 50,257', () => {
		// Ranks list every token but the special one, bytes first, then merges in learned order.
		const bytes = ranks.slice(0, 256);
		expect(bytes.every((t) => (typeof t === 'string' ? t.length : t.length) === 1)).toBe(true);
		expect(ranks.length - 256).toBe(50_000);
		expect(decode([50_256])).toBe('<|endoftext|>');
		expect(256 + 50_000 + 1).toBe(canonical.vocabularySize);
	});

	it("\"GPT-2's first merge was ' t'\"", () => {
		expect(ranks[256]).toBe(' t');
	});

	it('"44 GPT-2 tokens but 26 with GPT-4\'s tokenizer", while a sentence takes 20 in all three', () => {
		const count = (text: string) => [encode, encodeGpt4, encodeGpt4o].map((e) => e(text).length);
		const code =
			'def count_words(text):\n    words = text.split()\n    if not words:\n        return 0\n    return len(words)';
		expect(count(code)).toEqual([44, 26, 26]);
		const prose =
			'The cat sat on the mat. It looked out of the window and watched the birds fly by.';
		expect(count(prose)).toEqual([20, 20, 20]);
		expect(count('        return 0')).toEqual([9, 4, 4]);
	});
});
