import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ContextSession } from '#lib/harness/agent.ts';
import { search } from '#lib/harness/search.ts';
import { remembered } from '#lib/harness/memory.ts';

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

	describe('remembering between chats', () => {
		const m = readDataset('agent/memory');
		const names = ['Lily', 'Omar', 'Priya', 'Sam', 'Mei', 'Leo'];
		const rhymeOf = (name: string) =>
			c.turns
				.find((t) => t.task.startsWith(`${name},`))!
				.task.split('\n\n')[1]
				.split(/[,;]/)[0];
		const line = (name: string) =>
			m.notes.specific.notes.split('\n').find((l) => l.startsWith(`Name: ${name},`)) ?? '';

		it('the chat is the recorded one, and every question’s fact is in it', () => {
			expect(m.system).toBe(c.system);
			expect(rhymeOf('Sam')).toBe('Humpty Dumpty sat on a wall');
			expect(rhymeOf('Omar')).toBe('Mary had a little lamb');
			expect(c.turns[0].task).toMatch(/^Lily,.*the cat/s);
		});

		it('without notes, nothing is remembered', () => {
			expect(m.without.filter(remembered)).toHaveLength(0);
			for (const a of m.without) expect(a.answer).toMatch(/I'm sorry/);
		});

		it('open notes: only Mei, made-up astronomy, and none of the three answers', () => {
			const notes = m.notes.general.notes;
			expect(names.filter((n) => notes.includes(n))).toEqual(['Mei']);
			expect(notes).toMatch(/astronomy camp next summer/);
			expect(notes).toMatch(/books about space/);
			expect(c.turns.some((t) => /astronomy|camp/i.test(t.task + t.answer))).toBe(false);
			expect(m.notes.general.answers.filter(remembered)).toHaveLength(0);
		});

		it('specific notes: three right, Sam gets Mei’s star, Mei gets Leo’s clock, no Humpty Dumpty', () => {
			for (const n of ['Lily', 'Omar', 'Priya']) expect(line(n), n).toContain(rhymeOf(n));
			expect(line('Sam')).toContain(rhymeOf('Mei').split(',')[0]);
			expect(line('Mei')).toMatch(/Hickory dickory dock/i);
			expect(rhymeOf('Leo')).toMatch(/^Hickory dickory dock/);
			expect(m.notes.specific.notes).not.toMatch(/Humpty/);
			const answers = m.notes.specific.answers;
			expect(answers.map(remembered)).toEqual([true, true, false]);
			expect(answers[2].answer).toMatch(/Sam loves the rhyme "Twinkle, twinkle/);
		});

		it('in depth: notes 193 and 221 tokens against 616; Omar’s prompt 25 → 254', () => {
			expect([m.notes.general.tokens, m.notes.specific.tokens, m.chatTokens]).toEqual([
				193, 221, 616
			]);
			expect(m.without[1].tokens).toBe(25);
			expect(m.notes.specific.answers[1].tokens).toBe(254);
		});
	});
});
