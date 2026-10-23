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
});
