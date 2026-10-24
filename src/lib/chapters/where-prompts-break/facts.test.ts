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

	it('in depth: every 4-of-8 order ends with a positive example', () => {
		const { examples, orders } = d.sentiment;
		const endsWith = (o: { order: number[] }) => examples[o.order.at(-1)!][1];
		const worst = orders.filter((o) => o.correct === 4);
		expect(worst).toHaveLength(5);
		for (const o of worst) expect(endsWith(o)).toBe('positive');
		const negative = orders.filter((o) => endsWith(o) === 'negative');
		expect(negative).toHaveLength(12);
		for (const o of negative) expect(o.correct).toBeGreaterThanOrEqual(6);
	});

	it('in depth: the misses were confident; 76 of 80 other answers were over 99%', () => {
		const points = d.position.runs.flatMap((r) => r.points);
		const misses = points.filter((pt) => pt.p < 0.5);
		for (const m of misses) expect(m.p).toBeLessThan(0.02);
		const rest = points.filter((pt) => pt.p >= 0.5);
		expect(rest).toHaveLength(80);
		expect(rest.filter((pt) => pt.p > 0.99)).toHaveLength(76);
	});
});
