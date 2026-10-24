import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ContextSession } from '#lib/harness/agent.ts';

describe('managing the context', () => {
	const c: ContextSession = readDataset('agent/context');
	const total = (kept: number[], note = 0) =>
		c.baseTokens + c.questionTokens + note + kept.reduce((a, i) => a + c.turns[i].tokens, 0);

	it('everything overflows the 1,500-token budget; every strategy fits', () => {
		expect(c.budget).toBe(1500);
		expect(total(c.strategies.all.kept)).toBeGreaterThan(c.budget);
		for (const key of ['dropOldest', 'summarize', 'retrieve'] as const) {
			const s = c.strategies[key];
			expect(total(s.kept, s.noteTokens), key).toBeLessThanOrEqual(c.budget);
		}
	});

	it('dropping the oldest loses the cat task and the model makes up "Old Mother Hubbard"', () => {
		expect(c.strategies.dropOldest.kept).not.toContain(0);
		expect(c.strategies.dropOldest.answer).toContain('Old Mother Hubbard');
	});

	it('summarizing keeps "30 words"; retrieval brings back the cat task (closest match)', () => {
		expect(c.strategies.summarize.summary).toContain('30');
		expect(c.strategies.summarize.answer).toContain('30');
		const best = c.turns.reduce((b, t, i) => (t.similarity > c.turns[b].similarity ? i : b), 0);
		expect(best).toBe(0);
		expect(c.strategies.retrieve.retrieved).toEqual([0]);
		expect(c.strategies.retrieve.answer).toContain('30');
	});

	it('in depth: similarity is the cosine of 384-number vectors; cat 0.67, the rest 0.53–0.60', () => {
		const cos = (u: number[], v: number[]) => {
			const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
			return dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v));
		};
		for (const t of c.turns) {
			expect(t.vector).toHaveLength(384);
			expect(cos(c.questionVector, t.vector)).toBeCloseTo(t.similarity, 3);
		}
		const [cat, ...rest] = c.turns.map((t) => t.similarity);
		expect(cat).toBeCloseTo(0.67, 2);
		expect([Math.min(...rest), Math.max(...rest)].map((x) => x.toFixed(2))).toEqual([
			'0.53',
			'0.60'
		]);
	});

	it('in depth: the summary shrank the 221-token cat task to a 29-token note', () => {
		expect(c.turns[0].tokens).toBe(221);
		expect(c.strategies.summarize.noteTokens).toBe(29);
	});
});
