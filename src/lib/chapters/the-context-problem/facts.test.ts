import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CharModel } from '#lib/math/mlp.ts';
import canonical from '../../../../models/canonical.json';

describe('the context problem', () => {
	it('"about 2.5 billion possible pairs and about 127 trillion possible triples"', () => {
		expect(canonical.vocabularySize ** 2 / 1e9).toBeCloseTo(2.5, 1);
		expect(Math.round(canonical.vocabularySize ** 3 / 1e12)).toBe(127);
	});

	it('"GPT-2 can look at up to 1,024 tokens"', () => {
		expect(canonical.contextLength).toBe(1024);
	});

	it('In depth: the tiny model has 3 × 8 = 24 inputs to 64 neurons; each extra character adds 512 weights', () => {
		const config = { vocab: ['a', 'b'], context: 3, embedding: 8, hidden: 64 };
		const size = (context: number) => new CharModel({ ...config, context }, 1).W1.length;
		expect(size(3)).toBe(24 * 64);
		expect(size(4) - size(3)).toBe(512);
		expect(readFileSync('src/lib/workers/trainer.worker.ts', 'utf8')).toContain(
			'context: 3, embedding: 8, hidden: 64'
		);
	});

	it("In depth: a full Llama 3 window needs 125² = 15,625 times the scores of GPT-2's", () => {
		expect(128_000 / canonical.contextLength).toBe(125);
		expect((128_000 / canonical.contextLength) ** 2).toBe(15_625);
	});
});
