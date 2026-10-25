import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ContextSession } from '#lib/harness/agent.ts';
import { search } from '#lib/harness/search.ts';

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

	describe('words or meaning', () => {
		const questions = readDataset('agent/search').questions;
		const results = questions.map((q) =>
			search(
				q,
				c.turns.map((t) => t.text),
				c.turns.map((t) => t.vector)
			)
		);
		const right = (key: 'keyword' | 'meaning' | 'both') =>
			results.filter((r, i) => r[key].order[0] === questions[i].about).length;

		it('words find Sam, Leo, and the crown; meaning finds "kitty", a word in no exchange', () => {
			const byWords = (i: number) => results[i].keyword.order[0] === questions[i].about;
			const byMeaning = (i: number) => results[i].meaning.order[0] === questions[i].about;
			const ask = (text: string) => questions.findIndex((q) => q.question.includes(text));
			for (const w of ['Sam', 'Leo', 'crown']) {
				expect(byWords(ask(w)), w).toBe(true);
				expect(byMeaning(ask(w)), w).toBe(false);
			}
			expect(results[ask('kitty')].keyword.order).toEqual([]);
			expect(byMeaning(ask('kitty'))).toBe(true);
			expect(c.turns.some((t) => /kitty/i.test(t.text))).toBe(false);
		});

		it('the crown pulls meaning toward Humpty Dumpty', () => {
			const crown = results[questions.findIndex((q) => q.question.includes('crown'))];
			expect(c.turns[crown.meaning.order[0]].text).toContain('Humpty Dumpty');
		});

		it('merged: 4 of 5; words alone 4; meaning alone 2', () => {
			expect([right('both'), right('keyword'), right('meaning')]).toEqual([4, 4, 2]);
		});

		it('Leo: star rhyme 1/62 + 1/61 ≈ 0.0325 beats Leo’s 1/61 + 1/63 ≈ 0.0323', () => {
			const i = questions.findIndex((q) => q.question.includes('Leo'));
			const r = results[i];
			const star = c.turns.findIndex((t) => t.text.includes('Twinkle'));
			expect(r.both.order[0]).toBe(star);
			expect(r.keyword.order.indexOf(star)).toBe(1);
			expect(r.meaning.order.indexOf(questions[i].about)).toBe(2);
			expect(r.both.scores[star]).toBeCloseTo(1 / 62 + 1 / 61, 10);
			expect(r.both.scores[star].toFixed(4)).toBe('0.0325');
			expect(r.both.scores[questions[i].about].toFixed(4)).toBe('0.0323');
		});
	});
});
