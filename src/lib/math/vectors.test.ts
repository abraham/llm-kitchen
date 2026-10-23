import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EmbeddingMapData, EmbeddingVectors } from '#lib/models/load-json.ts';
import { add, cosine, nearest, project, sub } from './vectors.ts';

const map = JSON.parse(
	readFileSync('static/embeddings/minilm-map.json', 'utf8')
) as EmbeddingMapData;
const raw = JSON.parse(
	readFileSync('static/embeddings/minilm-vectors.json', 'utf8')
) as EmbeddingVectors;
const items = raw.words.map((word, i) => ({ word, vector: raw.vectors[i] }));
const vec = (w: string) => raw.vectors[raw.words.indexOf(w)];

describe('vector helpers', () => {
	it('computes cosine similarity', () => {
		expect(cosine([1, 0], [1, 0])).toBe(1);
		expect(cosine([1, 0], [0, 1])).toBe(0);
		expect(cosine([1, 0], [-1, 0])).toBe(-1);
	});
});

describe('embedding map data (Ch 5)', () => {
	it('stores the same neighbors the browser computes from the full vectors', () => {
		for (const w of map.words) {
			const browser = nearest(vec(w.word), items, 5, new Set([w.word])).map((n) => n.word);
			expect(browser, w.word).toEqual(w.neighbors.map((n) => n.word));
		}
	});

	it('places each word where projecting its vector puts it', () => {
		for (const w of map.words) {
			const [x, y] = project(vec(w.word), map.pca.mean, map.pca.components);
			expect(x).toBeCloseTo(w.x, 2);
			expect(y).toBeCloseTo(w.y, 2);
		}
	});

	it('"king − man + woman lands nearest to queen" among the map words', () => {
		const target = add(sub(vec('king'), vec('man')), vec('woman'));
		const [best] = nearest(target, items, 1, new Set(['king', 'man', 'woman']));
		expect(best.word).toBe('queen');
		expect(map.analogy.nearest[0].word).toBe('queen');
	});

	it('"cat is closest to kitten"', () => {
		expect(map.words.find((w) => w.word === 'cat')!.neighbors[0].word).toBe('kitten');
	});

	it('the 2D picture keeps only a small share of the information (the chapter says so)', () => {
		const shown = map.explainedVariance[0] + map.explainedVariance[1];
		expect(shown).toBeLessThan(0.2);
		expect(map.dimensions).toBe(384);
	});
});
