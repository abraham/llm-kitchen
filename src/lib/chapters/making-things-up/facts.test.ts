import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import {
	AGREE,
	answerEntropy,
	consistencyCheck,
	groupAnswers,
	summarize
} from '#lib/harness/hallucination.ts';

const rec = readDataset('hallucination/samples');
const q = (id: string) => rec.questions.find((x) => x.id === id)!;
const round = (x: number) => Math.round(x * 100) / 100;

describe('making things up', () => {
	it('11 questions, ten samples each, three about things invented for the chapter', () => {
		expect(rec.questions).toHaveLength(11);
		expect(rec.questions.filter((x) => x.kind === 'invented').map((x) => x.id)).toEqual([
			'velmora',
			'varlow',
			'quillfeather'
		]);
		for (const x of rec.questions) {
			expect(x.answers.plain).toHaveLength(10);
			expect(x.answers.allowed).toHaveLength(10);
		}
	});

	it('"nine different authors in ten tries" for the invented book', () => {
		const groups = groupAnswers(q('velmora').answers.plain);
		expect(groups).toHaveLength(9);
		expect(groups[0]).toMatchObject({ text: 'Evelyn Waugh', count: 2, verdict: 'wrong' });
	});

	it('the six right answers agree 10 of 10; the check flags 4 of the 5 wrong ones', () => {
		const right = rec.questions.filter(
			(x) => consistencyCheck(x.answers.plain).top.verdict === 'right'
		);
		expect(right).toHaveLength(6);
		for (const x of right) expect(groupAnswers(x.answers.plain)[0].count).toBe(10);
		expect(AGREE).toBe(8);
		expect(summarize(rec.questions, 'plain')).toEqual({
			right: 6,
			wrong: 5,
			declined: 0,
			wrongFlagged: 4,
			rightFlagged: 0
		});
	});

	it('all ten say Eddy Merckx for 1987, with or without "I don\'t know" allowed', () => {
		for (const prompt of ['plain', 'allowed'] as const) {
			const check = consistencyCheck(q('roche').answers[prompt]);
			expect(check).toMatchObject({ outcome: 'trusted', top: { text: 'Eddy Merckx', count: 10 } });
			expect(check.top.verdict).toBe('wrong');
		}
		expect(q('roche').truth).toBe('Stephen Roche');
	});

	it('allowed to decline: the book and town 10 of 10, the Nobel Prize half the time, the chemist never', () => {
		const declined = (id: string) =>
			q(id).answers.allowed.filter((a) => a.verdict === 'declined').length;
		expect([
			declined('velmora'),
			declined('quillfeather'),
			declined('heaney'),
			declined('varlow')
		]).toEqual([10, 10, 5, 0]);
		const s = summarize(rec.questions, 'allowed');
		expect(s).toMatchObject({ right: 6, wrong: 2, declined: 3 });
		expect(consistencyCheck(q('roche').answers.allowed).top.text).toBe('Eddy Merckx');
	});

	it('In depth: entropy 0 when all agree, 2.16 for the book, 0.90 for the Nobel Prize, 0.67 merged', () => {
		expect(answerEntropy(q('australia').answers.plain)).toBe(0);
		expect(round(Math.log(10))).toBe(2.3);
		expect(round(answerEntropy(q('velmora').answers.plain))).toBe(2.16);
		const nobel = groupAnswers(q('heaney').answers.plain).map((g) => [g.text, g.count]);
		expect(nobel).toEqual([
			['Saul Bellow', 6],
			['Svetlana Alexievich', 3],
			['Svetlana Aleksievich', 1]
		]);
		expect(round(answerEntropy(q('heaney').answers.plain))).toBe(0.9);
		const merged = -(0.6 * Math.log(0.6) + 0.4 * Math.log(0.4));
		expect(round(merged)).toBe(0.67);
	});

	it('at temperature 0: the same six right and five wrong; "Helen Macdonald", a name no sample gave', () => {
		const greedy = rec.questions.map((x) => x.greedy.plain.verdict);
		expect(greedy.filter((v) => v === 'right')).toHaveLength(6);
		expect(greedy.filter((v) => v === 'wrong')).toHaveLength(5);
		for (const x of rec.questions) {
			expect(x.greedy.plain.verdict).toBe(consistencyCheck(x.answers.plain).top.verdict);
		}
		expect(q('velmora').greedy.plain.text).toBe('Helen Macdonald');
		expect(q('velmora').answers.plain.map((a) => a.text)).not.toContain('Helen Macdonald');
		expect(q('roche').greedy.plain.text).toBe('Eddy Merckx');
	});

	it('two of the four less well-known answers come back right', () => {
		const obscure = rec.questions.filter((x) => x.kind === 'obscure');
		expect(obscure.map((x) => consistencyCheck(x.answers.plain).top.verdict)).toEqual([
			'wrong',
			'wrong',
			'right',
			'right'
		]);
	});

	it('In depth: answering is worth p − (1 − p)·t/(1 − t), zero at p = t; t = 0.9 costs 9 points', () => {
		const worth = (p: number, t: number) => p - ((1 - p) * t) / (1 - t);
		for (const t of [0.5, 0.75, 0.9]) {
			expect(worth(t, t)).toBeCloseTo(0, 12);
			expect(worth(t + 0.01, t)).toBeGreaterThan(0);
			expect(worth(t - 0.01, t)).toBeLessThan(0);
		}
		expect(0.9 / (1 - 0.9)).toBeCloseTo(9, 12);
		expect(worth(0.01, 0)).toBeGreaterThan(0);
	});
});
