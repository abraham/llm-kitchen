import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ContextSession } from '#lib/harness/agent.ts';

describe('managing the context', () => {
	const c: ContextSession = readDataset('agent/context');
	const total = (kept: number[], note = 0) =>
		c.baseTokens + c.questionTokens + note + kept.reduce((a, i) => a + c.turns[i].tokens, 0);

	it('everything overflows the 600-token budget; every strategy fits', () => {
		expect(c.budget).toBe(600);
		expect(total(c.strategies.all.kept)).toBeGreaterThan(c.budget);
		for (const key of ['dropOldest', 'summarize', 'retrieve'] as const) {
			const s = c.strategies[key];
			expect(total(s.kept, s.noteTokens), key).toBeLessThanOrEqual(c.budget);
		}
	});

	it('with everything, the model names Lily; dropping the oldest loses her', () => {
		expect(c.turns[0].task).toContain('Lily');
		expect(c.turns[0].task).toContain('the cat and the fiddle');
		expect(c.strategies.all.answer).toContain('Lily');
		expect(c.strategies.dropOldest.kept).not.toContain(0);
		expect(c.strategies.dropOldest.answer).not.toContain('Lily');
		expect(c.strategies.dropOldest.answer).toContain("don't have information");
	});

	it('summarizing keeps "Lily"; retrieval brings back the cat rhyme (closest match)', () => {
		expect(c.strategies.summarize.summary).toContain('Lily');
		expect(c.strategies.summarize.answer).toContain('Lily');
		const best = c.turns.reduce((b, t, i) => (t.similarity > c.turns[b].similarity ? i : b), 0);
		expect(best).toBe(0);
		expect(c.strategies.retrieve.retrieved).toEqual([0]);
		expect(c.strategies.retrieve.answer).toContain('Lily');
	});

	it('in depth: similarity is the cosine of 384-number vectors; cat 0.49, the rest 0.35–0.45', () => {
		const cos = (u: number[], v: number[]) => {
			const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
			return dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v));
		};
		for (const t of c.turns) {
			expect(t.vector).toHaveLength(384);
			expect(cos(c.questionVector, t.vector)).toBeCloseTo(t.similarity, 3);
		}
		const [cat, ...rest] = c.turns.map((t) => t.similarity);
		expect(cat.toFixed(2)).toBe('0.49');
		expect([Math.min(...rest), Math.max(...rest)].map((x) => x.toFixed(2))).toEqual([
			'0.35',
			'0.45'
		]);
	});

	it('in depth: the summary shrank the 149-token first exchange to a 30-token note, mouse and all', () => {
		expect(c.turns[0].tokens).toBe(149);
		expect(c.strategies.summarize.noteTokens).toBe(30);
		expect(c.turns[0].answer).toMatch(/cat catches a mouse/);
		expect(c.turns[0].task).not.toMatch(/mouse/);
		expect(c.strategies.summarize.summary).toMatch(/mice/);
	});
});
