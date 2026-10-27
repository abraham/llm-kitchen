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

describe('word problems', () => {
	const { problems } = readDataset('prompts/problems');
	const right = (k: 'plain' | 'distracted' | 'ignore' | 'turns') =>
		problems.filter((p) => p.runs[k].correct).length;
	const find = (start: string) => problems.find((p) => p.facts[0].startsWith(start))!;
	const reply = (p: (typeof problems)[number], turn: number) =>
		p.runs.turns.messages.filter((m) => m.role === 'assistant')[turn].content;

	it('24 right as written, 18 with an extra sentence, 17 when told to ignore it', () => {
		expect(problems).toHaveLength(24);
		expect([right('plain'), right('distracted'), right('ignore')]).toEqual([24, 18, 17]);
	});

	it('5 of the 6 misses used the irrelevant number; Nina answered 63, not 33', () => {
		const misses = problems.filter((p) => !p.runs.distracted.correct);
		const got = Object.fromEntries(misses.map((p) => [p.facts[0], p.runs.distracted.answer]));
		// Each answer below is worked out with the extra sentence's number; Raj's is not.
		expect(got).toEqual({
			'A baker makes 60 rolls.': '69', // 60 − 36 + 45
			'Jo buys 3 packs of 6 eggs.': '25', // 18 − 4 + 11
			'A tank holds 100 liters.': '-15', // 60 − 35 − 40
			'Nina bakes 4 trays of 12 cookies.': '63', // 48 − 15 + 30
			'Eva plants 6 rows of 8 carrots.': '57', // 48 − 11 + 20
			'Tickets cost 8 dollars each.': '-18' // 32 − 50
		});
		for (const p of misses.filter((p) => !p.facts[0].startsWith('Tickets'))) {
			expect(p.distractor).toContain(
				{ '69': '45', '25': '11', '-15': '60', '63': '30', '57': '20' }[p.runs.distracted.answer!]!
			);
		}
		const nina = find('Nina');
		expect(nina.distractor).toBe('Her friend baked 30 cookies.');
		expect(nina.facts[1]).toContain('15');
		expect(nina.answer).toBe(33);
	});

	it('over three turns 18 of 24; it asked for details in 20 and answered early in 21', () => {
		expect(right('turns')).toBe(18);
		expect(problems.filter((p) => !reply(p, 0).includes('Answer:'))).toHaveLength(20);
		expect(problems.filter((p) => reply(p, 1).includes('Answer:'))).toHaveLength(21);
	});

	it('Omar: 10 after the track length, then 40 instead of 1,600', () => {
		const omar = find('Omar');
		expect(omar.facts).toEqual(['Omar runs laps of a 400-meter track.', 'He runs 4 laps.']);
		expect(reply(omar, 1)).toMatch(/Answer: 10\b/);
		expect([omar.answer, omar.runs.turns.answer]).toEqual([1600, '40']);
	});
});
