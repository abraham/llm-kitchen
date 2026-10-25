import { describe, expect, it } from 'vitest';
import canonical from '../../../../models/canonical.json';
import { attend, maskFuture, softmaxRows } from '#lib/math/attention.ts';
import { readDataset } from '#lib/datasets/read.ts';
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

	it('In depth: "d_k = 768 / 12 = 64", divided by "sqrt(64) = 8", in "144 heads"', () => {
		const dk = canonical.embeddingSize / canonical.heads;
		expect(dk).toBe(64);
		expect(Math.sqrt(dk)).toBe(8);
		expect(canonical.layers * canonical.heads).toBe(144);
	});

	it('In depth: the mask leaves n(n+1)/2 scores, "524,800 for a full window"', () => {
		const n = 5;
		const toy = Array.from({ length: n }, (_, i) => [i + 1, 1]);
		const { scores } = attend({ tokens: toy.map(String), queries: toy, keys: toy, values: toy });
		expect(scores.flat().filter((s) => s !== null)).toHaveLength((n * (n + 1)) / 2);
		expect((canonical.contextLength * (canonical.contextLength + 1)) / 2).toBe(524_800);
	});

	it('In depth: rotary scores depend on places only through the distance m - n', () => {
		// Turn each pair of numbers by place * theta_j, theta_j = base^(-2j/d), as in RoFormer.
		const rotate = (v: number[], place: number, base: number) =>
			v.flatMap((_, i) => {
				if (i % 2) return [];
				const angle = place * base ** (-i / v.length);
				const [x, y] = [v[i], v[i + 1]];
				return [
					x * Math.cos(angle) - y * Math.sin(angle),
					x * Math.sin(angle) + y * Math.cos(angle)
				];
			});
		const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
		const q = [0.3, -1.2, 0.8, 0.5];
		const k = [1.1, 0.4, -0.6, 0.9];
		for (const base of [10_000, 500_000]) {
			const score = (m: number, n: number) => dot(rotate(q, m, base), rotate(k, n, base));
			expect(score(7, 3)).toBeCloseTo(score(104, 100), 10);
			expect(score(7, 3)).not.toBeCloseTo(score(7, 5), 3);
		}
	});

	describe('one head, step by step', () => {
		const d = readDataset('attention/ioi-scores');
		const tokens = d.tokens.map((t) => t.text);
		const n = tokens.length;
		const scores = d.scores[9][9];
		const weights = softmaxRows(maskFuture(scores));
		const last = n - 1;

		it('the mask hides 91 of the 196 squares', () => {
			expect(n).toBe(14);
			const hidden = maskFuture(scores)
				.flat()
				.filter((s) => s === null).length;
			expect([hidden, n * n]).toEqual([91, 196]);
		});

		it('head 9.9: Mary 4.25 vs John 3.23 becomes 36% vs 13%; When 4.24 and 36%', () => {
			expect(tokens.slice(0, 4)).toEqual(['When', ' Mary', ' and', ' John']);
			expect([scores[last][1], scores[last][3], scores[last][0]]).toEqual([4.25, 3.23, 4.24]);
			expect(
				[weights[last][1], weights[last][3], weights[last][0]].map((w) => Math.round(w * 100))
			).toEqual([36, 13, 36]);
		});

		it('in depth: a gap of Δ in score is a ratio of e^Δ in weight: 2.8, and 36% is about 2.8 × 13%', () => {
			const ratio = weights[last][1] / weights[last][3];
			expect(ratio).toBeCloseTo(Math.exp(4.25 - 3.23), 10);
			expect(Math.exp(4.25 - 3.23).toFixed(1)).toBe('2.8');
			expect((36 / 13).toFixed(1)).toBe('2.8');
		});
	});
});
