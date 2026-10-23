import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('seeing pictures', () => {
	const d = readDataset('vision/clip');
	const names: string[] = d.images.map((i: { name: string }) => i.name);
	const best = (c: { similarity: number[] }) =>
		names[c.similarity.indexOf(Math.max(...c.similarity))];

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
