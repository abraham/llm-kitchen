import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('where prompts break', () => {
	const d = readDataset('prompts/fragile');

	it('the order of four examples moves the score between 4 and 8 of 8', () => {
		const scores = d.sentiment.orders.map((o: { correct: number }) => o.correct);
		expect(scores).toHaveLength(24);
		expect([Math.min(...scores), Math.max(...scores)]).toEqual([4, 8]);
	});

	it('the layout moves it between 4 and 7', () => {
		const scores = d.sentiment.formats.map((f: { correct: number }) => f.correct);
		expect(scores[0]).toBe(7);
		expect(Math.min(...scores)).toBe(4);
	});

	it('every miss came with the line in the middle', () => {
		const { positions, runs, facts } = d.position;
		const misses = runs.flatMap((r: { points: { position: number; p: number }[] }) =>
			r.points.filter((pt) => pt.p < 0.5)
		);
		expect(facts).toBe(30);
		expect(misses).toHaveLength(8);
		for (const m of misses) {
			expect(m.position).toBeGreaterThan(positions[0]);
			expect(m.position).toBeLessThan(positions.at(-1)!);
		}
	});
});
