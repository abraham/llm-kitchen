import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('seeing pictures', () => {
	const d = readDataset('vision/clip');
	const names: string[] = d.images.map((i: { name: string }) => i.name);
	const best = (c: { similarity: number[] }) =>
		names[c.similarity.indexOf(Math.max(...c.similarity))];

	it('in depth: a patch is 3,072 numbers; the shared space has 512', () => {
		expect(d.patchSize * d.patchSize * 3).toBe(3072);
		expect(d.grid * d.grid + 1).toBe(50);
		expect(d.embeddingDimensions).toBe(512);
	});

	it('in depth: probabilities are a softmax of 100 × similarity; red circle 42% vs square 32%', () => {
		for (const c of d.captions) {
			const e = c.similarity.map((s: number) => Math.exp(100 * s));
			const total = e.reduce((a: number, b: number) => a + b, 0);
			e.forEach((x: number, i: number) => expect(x / total).toBeCloseTo(c.probability[i], 1));
		}
		const red = d.captions[0];
		expect(red.text).toBe('a red circle');
		expect(names.slice(0, 2)).toEqual(['red-circle', 'red-square']);
		expect(red.similarity.slice(0, 2).map((s: number) => s.toFixed(3))).toEqual(['0.271', '0.268']);
		expect(red.probability.slice(0, 2).map((p: number) => Math.round(p * 100))).toEqual([42, 32]);
	});

	it('cuts 224-pixel pictures into a 7 × 7 grid of 32-pixel patches of 768 numbers', () => {
		expect([d.imageSize, d.grid, d.patchSize, d.patchDimensions]).toEqual([224, 7, 32, 768]);
	});

	it('gives identical background patches identical vectors', () => {
		const patches: number[][] = d.images[0].patches;
		expect(patches[0]).toEqual(patches[48]);
	});

	it('picks the right picture first for all 12 exact descriptions', () => {
		const exact = d.captions.slice(0, 12);
		for (const c of exact) expect(best(c)).toBe(c.text.slice(2).replace(' ', '-'));
	});

	it('barely prefers a circle for “something round”; the cat matches nothing well', () => {
		const caption = (t: string) => d.captions.find((c) => c.text === t)!;
		expect(best(caption('something round'))).toMatch(/circle/);
		const exactBest = Math.min(
			...d.captions.slice(0, 12).map((c: { similarity: number[] }) => Math.max(...c.similarity))
		);
		expect(Math.max(...caption('a photo of a cat').similarity)).toBeLessThan(exactBest);
	});
});
