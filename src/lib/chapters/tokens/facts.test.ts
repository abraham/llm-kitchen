import ranks from 'gpt-tokenizer/bpeRanks/r50k_base';
import { decode } from 'gpt-tokenizer/encoding/r50k_base';
import { describe, expect, it } from 'vitest';
import canonical from '../../../../models/canonical.json';

describe('tokens', () => {
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
});
