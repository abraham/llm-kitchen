import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { EmbeddingMapData, EmbeddingVectors } from '#lib/datasets/parsers/embeddings.ts';
import { add, cosine, nearest, project, sub } from './vectors.ts';

const map = readDataset('embeddings/minilm-map') as EmbeddingMapData;
const raw = readDataset('embeddings/minilm-vectors') as EmbeddingVectors;
const items = raw.words.map((word, i) => ({ word, vector: raw.vectors[i] }));
const vec = (w: string) => raw.vectors[raw.words.indexOf(w)];

describe('vector helpers', () => {
	it('computes cosine similarity', () => {
		expect(cosine([1, 0], [1, 0])).toBe(1);
		expect(cosine([1, 0], [0, 1])).toBe(0);
		expect(cosine([1, 0], [-1, 0])).toBe(-1);
	});
});

describe('embedding map data (embeddings)', () => {
	it('stores the same neighbors the browser computes from the full vectors', () => {
		for (const w of map.words) {
			const browser = nearest(vec(w.word), items, 5, new Set([w.word])).map((n) => n.word);
			expect(browser, w.word).toEqual(w.neighbors.map((n) => n.word));
		}
	});

	it('places each word where projecting its vector puts it', () => {
		for (const w of map.words) {
			const [x, y, z] = project(vec(w.word), map.pca.mean, map.pca.components);
			expect(x).toBeCloseTo(w.x, 2);
			expect(y).toBeCloseTo(w.y, 2);
			expect(z).toBeCloseTo(w.z, 2);
		}
	});

	it('"king − man + woman lands nearest to queen" among the map words', () => {
		const target = add(sub(vec('king'), vec('man')), vec('woman'));
		const [best] = nearest(target, items, 1, new Set(['king', 'man', 'woman']));
		expect(best.word).toBe('queen');
		expect(map.analogy.nearest[0].word).toBe('queen');
	});

	it('man → woman "partly lines up" with king → queen: "about 75° apart", closer than most steps, not parallel on the map', () => {
		const step = sub(vec('woman'), vec('man'));
		const aligned = cosine(step, sub(vec('queen'), vec('king')));
		expect(aligned).toBeCloseTo(0.26, 2);
		expect(Math.round((Math.acos(aligned) * 180) / Math.PI / 5) * 5).toBe(75);
		// Compared with the step between every pair of map words, this one is unusually aligned.
		const others = raw.words.flatMap((a, i) =>
			raw.words.slice(i + 1).map((b) => cosine(step, sub(vec(b), vec(a))))
		);
		const beaten = others.filter((c) => Math.abs(c) < aligned).length / others.length;
		expect(aligned).toBeGreaterThan(0.2);
		expect(beaten).toBeGreaterThan(0.9);

		const at = (w: string) => map.words.find((x) => x.word === w)!;
		const flat = (a: string, b: string) => [
			at(b).x - at(a).x,
			at(b).y - at(a).y,
			at(b).z - at(a).z
		];
		expect(cosine(flat('man', 'woman'), flat('king', 'queen'))).toBeLessThan(0.5);
	});

	it('"cat is closest to kitten"', () => {
		expect(map.words.find((w) => w.word === 'cat')!.neighbors[0].word).toBe('kitten');
	});

	it('the 3D picture keeps only a small share of the information (the chapter says so)', () => {
		const shown = map.explainedVariance.reduce((a, b) => a + b, 0);
		expect(shown).toBeLessThan(0.2);
		expect(map.dimensions).toBe(384);
	});
});
