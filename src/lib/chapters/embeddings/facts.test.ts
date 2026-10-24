import { describe, expect, it } from 'vitest';
import type { EmbeddingMapData, EmbeddingVectors } from '#lib/datasets/parsers/embeddings.ts';
import { readDataset } from '#lib/datasets/read.ts';
import { parameterBreakdown } from '#lib/math/transformer.ts';
import { add, cosine, dot, nearest, norm, sub } from '#lib/math/vectors.ts';
import canonical from '../../../../models/canonical.json';

const map = readDataset('embeddings/minilm-map') as EmbeddingMapData;
const raw = readDataset('embeddings/minilm-vectors') as EmbeddingVectors;
const items = raw.words.map((word, i) => ({ word, vector: raw.vectors[i] }));
const vec = (w: string) => raw.vectors[raw.words.indexOf(w)];

describe('embeddings, In depth', () => {
	it('multiplying a one-hot list by the table "picks out one row"', () => {
		const table = [
			[0.1, -0.4, 0.7],
			[0.9, 0.2, -0.3],
			[-0.5, 0.6, 0.8]
		];
		const oneHot = [0, 1, 0];
		const product = table[0].map((_, j) => oneHot.reduce((a, x, i) => a + x * table[i][j], 0));
		expect(product).toEqual(table[1]);
	});

	it('"50,257 × 768 = 38,597,376 numbers, about 31% of GPT-2 small\'s 124 million weights"', () => {
		const table = canonical.vocabularySize * canonical.embeddingSize;
		expect(table).toBe(38_597_376);
		expect(Math.round((table / canonical.parameters) * 100)).toBe(31);
	});

	it('GPT-2 "uses it twice": its weights only add up with the table counted once', () => {
		expect(parameterBreakdown(canonical).total).toBe(canonical.parameters);
	});

	it('"cat and kitten score 0.79"; the vectors all have length 1, so cosine is the dot product', () => {
		expect(cosine(vec('cat'), vec('kitten'))).toBeCloseTo(0.79, 2);
		for (const v of raw.vectors) expect(norm(v)).toBeCloseTo(1, 4);
		expect(dot(vec('cat'), vec('kitten'))).toBeCloseTo(cosine(vec('cat'), vec('kitten')), 4);
	});

	it('the map keeps 2 of 384 directions, "only about 13% of the spread"', () => {
		expect(map.dimensions - 2).toBe(382);
		expect(Math.round((map.explainedVariance[0] + map.explainedVariance[1]) * 100)).toBe(13);
	});

	it('"counted with them, the nearest word is king itself, at 0.63 against 0.58 for queen"', () => {
		const target = add(sub(vec('king'), vec('man')), vec('woman'));
		const all = nearest(target, items, 3);
		expect(all[0].word).toBe('king');
		expect(all[0].similarity).toBeCloseTo(0.63, 2);
		expect(all.find((n) => n.word === 'queen')!.similarity).toBeCloseTo(0.58, 2);
		expect(nearest(target, items, 1, new Set(['king', 'man', 'woman']))[0].word).toBe('queen');
	});
});
