import { describe, expect, it } from 'vitest';
import { tokenize } from '#lib/models/tokenizers.ts';
import { annotateTokens, describeTokenDiff, diffTokens, tokenKindLabel } from './token-diff.ts';

describe('annotateTokens & diffTokens', () => {
	it('collapses strawberry (3 tokens) into " strawberry" (1 token) in GPT-2', async () => {
		const before = annotateTokens(await tokenize('gpt2', 'strawberry'));
		const after = annotateTokens(await tokenize('gpt2', ' strawberry'));
		const diff = diffTokens(before, after);

		expect(diff.map((d) => `${d.kind}:${d.token.id}`)).toEqual([
			'removed:301',
			'removed:1831',
			'removed:8396',
			'added:41236'
		]);
		expect(after[0].leadingSpace).toBe(true);
		expect(after[0].utf8Hex[0]).toBe('20');
		expect(describeTokenDiff(diff[3], 'GPT-2')).toContain('token 41236 in GPT-2');
		expect(describeTokenDiff(diff[3], 'GPT-2')).toContain('leading space');
	});

	it('shows cafe → café re-splitting the tail in GPT-2 with é as C3 A9', async () => {
		const before = annotateTokens(await tokenize('gpt2', 'cafe'));
		const after = annotateTokens(await tokenize('gpt2', 'café'));
		const diff = diffTokens(before, after);

		expect(diff.map((d) => `${d.kind}:${d.token.text}`)).toEqual([
			'same:c',
			'removed:afe',
			'added:af',
			'added:é'
		]);
		expect(after[2].utf8Hex).toEqual(['C3', 'A9']);
	});

	it('flags multi-byte emoji pieces as partial UTF-8 bytes in GPT-2', async () => {
		const after = annotateTokens(await tokenize('gpt2', 'The 🐱'));
		const partials = after.filter((t) => t.partialUtf8);
		expect(partials.length).toBeGreaterThan(0);
		for (const p of partials) {
			expect(p.utf8Hex).toEqual([]);
			expect(tokenKindLabel(p)).toBe('Split UTF-8 bytes');
		}
		expect(describeTokenDiff({ kind: 'added', token: partials[0] }, 'GPT-2')).toContain(
			'split across its UTF-8 bytes'
		);
	});

	it('keeps unchanged tail when indenting Python code and compares GPT-2 vs GPT-4 counts', async () => {
		const gpt2Before = annotateTokens(await tokenize('gpt2', 'return 0'));
		const gpt2After = annotateTokens(await tokenize('gpt2', '        return 0'));
		const gpt2Diff = diffTokens(gpt2Before, gpt2After);
		expect(gpt2After).toHaveLength(9);
		expect(gpt2Diff.at(-1)?.kind).toBe('same');

		const gpt4After = annotateTokens(await tokenize('cl100k', '        return 0'));
		expect(gpt4After).toHaveLength(4);
		expect(gpt4After[0].whitespaceOnly).toBe(true);
	});
});
