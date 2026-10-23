import { describe, expect, it } from 'vitest';
import canonical from '../../../../models/canonical.json';
import { attend } from '#lib/math/attention.ts';
import { parameterBreakdown } from '#lib/math/transformer.ts';

describe('attention', () => {
	it('"one attention step would blend them in exactly the same way" without position vectors', () => {
		// One made-up vector per word, so both sentences use identical vectors for identical words.
		const vec: Record<string, number[]> = {
			the: [0.1, 0.4],
			dog: [0.9, 0.2],
			chased: [0.3, 0.8],
			cat: [0.7, 0.6],
			'.': [0.5, 0.1]
		};
		const run = (words: string[]) =>
			attend({
				tokens: words,
				queries: words.map((w) => vec[w].map((x) => 2 * x)),
				keys: words.map((w) => vec[w]),
				values: words.map((w) => vec[w])
			}).outputs.at(-1)!;
		const a = run(['the', 'dog', 'chased', 'the', 'cat', '.']);
		const b = run(['the', 'cat', 'chased', 'the', 'dog', '.']);
		a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 12));
	});

	it('"GPT-2 has 1,024 position vectors", which count toward its weights', () => {
		expect(canonical.contextLength).toBe(1024);
		const withoutPositions = parameterBreakdown({ ...canonical, contextLength: 0 });
		expect(parameterBreakdown(canonical).total - withoutPositions.total).toBe(
			1024 * canonical.embeddingSize
		);
	});
});
