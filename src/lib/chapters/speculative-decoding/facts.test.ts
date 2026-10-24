import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import canonical from '../../../../models/canonical.json';
import { writtenAfter, type SpeculativeRecording } from '#lib/math/speculative.ts';

describe('guessing ahead', () => {
	const rec: SpeculativeRecording = readDataset('speculative/drafts');
	const run = (prompt: string) => rec.runs.find((r) => r.prompt === prompt)!;

	it('drafts 4 tokens at a time with GPT-2 small (124M) for GPT-2 medium (355M)', () => {
		expect(rec.draft).toBe(4);
		expect(rec.drafter.parameters).toBe(canonical.parameters);
		expect(Math.round(rec.target.parameters / 1e6)).toBe(355);
	});

	it('rebuilds the written text from the rounds, 30 tokens each', () => {
		for (const r of rec.runs) {
			const rebuilt = r.rounds.flatMap((round) => [
				...round.guesses.slice(0, round.kept),
				round.added
			]);
			expect(rebuilt.slice(0, rec.newTokens)).toEqual(r.written);
			expect(r.written).toHaveLength(30);
			expect(writtenAfter(r, r.rounds.length)).toBe(30);
		}
	});

	it('takes 7 passes for the cat and the counting prompt, 9 for France with two empty rounds', () => {
		expect(run('The cat sat on the').rounds).toHaveLength(7);
		expect(run('One, two, three, four, five,').rounds).toHaveLength(7);
		const france = run('The capital of France is');
		expect(france.rounds).toHaveLength(9);
		expect(france.rounds.filter((r) => r.kept === 0)).toHaveLength(2);
		for (const r of rec.runs)
			expect(Math.max(...r.rounds.map((x) => x.kept + 1))).toBeLessThanOrEqual(5);
	});

	it('In depth: keeping a guess with chance min(1, p/q) and resampling from max(0, p - q) gives exactly p', () => {
		const p = [0.5, 0.3, 0.15, 0.05];
		const q = [0.2, 0.5, 0.1, 0.2];
		const kept = q.map((qx, x) => qx * Math.min(1, p[x] / qx));
		const rejected = 1 - kept.reduce((a, b) => a + b, 0);
		const residual = p.map((px, x) => Math.max(0, px - q[x]));
		const total = residual.reduce((a, b) => a + b, 0);
		const out = kept.map((k, x) => k + (rejected * residual[x]) / total);
		out.forEach((o, x) => expect(o).toBeCloseTo(p[x], 12));
	});

	it('In depth: (1 - 0.8^5) / (1 - 0.8) is about 3.4; the cat run averaged about 4.3', () => {
		const expected = (alpha: number, k: number) => (1 - alpha ** (k + 1)) / (1 - alpha);
		expect(Math.round(expected(0.8, 4) * 10) / 10).toBe(3.4);
		expect(expected(0.999999, 4)).toBeCloseTo(5, 4);
		const cat = run('The cat sat on the');
		expect(Math.round((writtenAfter(cat, cat.rounds.length) / cat.rounds.length) * 10) / 10).toBe(
			4.3
		);
	});
});
