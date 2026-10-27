import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { summarizeLabels, type LabelsModel } from './labels.ts';

describe('few-shot', () => {
	const d = readDataset('prompts/fewshot');
	const task = (name: string) => d.tasks.find((t) => t.name === name)!;
	const p = (name: string, query: string, shots: number, model: 'qwen' | 'gpt2') =>
		task(name)
			.tests.find((t) => t.query === query)!
			.runs.find((r) => r.shots === shots)![model];

	it('Qwen goes from about 1% to 96% on "happy" with four examples', () => {
		expect(p('Opposites', 'happy', 0, 'qwen')).toBeLessThan(0.01);
		expect(p('Opposites', 'happy', 4, 'qwen')).toBeCloseTo(0.96, 2);
		expect(p('Opposites', 'light', 4, 'qwen')).toBeLessThan(p('Opposites', 'light', 1, 'qwen'));
	});

	it('the made-up labels go from almost nothing to 22–78%', () => {
		const t = task('Made-up labels');
		const four = t.tests.map((x) => x.runs.find((r) => r.shots === 4)!.qwen);
		const zero = t.tests.map((x) => x.runs.find((r) => r.shots === 0)!.qwen);
		expect(Math.max(...zero)).toBeLessThan(0.001);
		expect(Math.round(Math.min(...four) * 100)).toBe(22);
		expect(Math.round(Math.max(...four) * 100)).toBe(78);
	});

	it('GPT-2 repeats the word, or says "zork" after four examples', () => {
		for (const test of task('Opposites').tests.slice(0, 3)) {
			expect(test.runs.find((r) => r.shots === 4)!.gpt2Top[0].text).toBe(` ${test.query}`);
		}
		for (const test of task('Made-up labels').tests) {
			expect(test.runs.find((r) => r.shots === 4)!.gpt2Top[0].text).toBe(' z');
		}
	});

	it('one GPT-2 head looks almost only at the earlier answers', () => {
		for (const t of d.tasks) expect(t.head.score).toBeGreaterThan(0.9);
	});

	it('in depth: "zork" is " z" + "ork", and "ork" after " z" is over 99%', () => {
		const run = task('Made-up labels')
			.tests.find((t) => t.query === 'horse')!
			.runs.find((r) => r.shots === 4)!;
		const z = run.gpt2Top.find((g) => g.text === ' z')!.p;
		expect(run.gpt2).toBeCloseTo(0.69, 2);
		expect(run.gpt2 / z).toBeGreaterThan(0.99);
		const tokens = task('Made-up labels').head.tokens.map((t) => t.text);
		expect(tokens.slice(1, 4)).toEqual([' ->', ' bl', 'ip']);
		expect(tokens.slice(6, 9)).toEqual([' ->', ' z', 'ork']);
	});

	it('in depth: head 5.0 sends 98% to the four answers, from 5% to 35%', () => {
		const { head } = task('Opposites');
		expect([head.layer, head.head]).toEqual([5, 0]);
		const last = head.tokens.length - 1;
		const answers = head.attention.filter(
			(_, i) => i > 0 && i < last && head.tokens[i - 1].text === ' ->'
		);
		expect(answers).toHaveLength(4);
		expect(answers.reduce((a, b) => a + b)).toBeCloseTo(0.98, 2);
		expect(answers[0]).toBeCloseTo(0.05, 2);
		expect(answers[3]).toBeCloseTo(0.35, 2);
	});
});

describe('few-shot: do the labels have to be right?', () => {
	const rec = readDataset('prompts/labels');
	const s = (model: LabelsModel, condition: string) => summarizeLabels(rec, model, condition);

	it('eight examples, 24 new reviews, five ways to label the examples', () => {
		expect(rec.examples).toHaveLength(8);
		expect(rec.tests).toHaveLength(24);
		expect(rec.conditions.map((c) => c.id)).toEqual([
			'none',
			'correct',
			'half-wrong',
			'flipped',
			'made-up'
		]);
		const wrong = (id: string) => {
			const c = rec.conditions.find((x) => x.id === id)!;
			return c.shown.filter((l, i) => l !== rec.examples[i].label).length;
		};
		expect([wrong('correct'), wrong('half-wrong'), wrong('flipped')]).toEqual([0, 4, 8]);
	});

	it('label share: Qwen 27% and GPT-2 almost none without examples; over 99% and 90% with any', () => {
		expect(Math.round(s('qwen', 'none').labelShare * 100)).toBe(27);
		expect(s('gpt2', 'none').labelShare).toBeLessThan(0.01);
		for (const c of ['correct', 'half-wrong', 'flipped', 'made-up']) {
			expect(s('qwen', c).labelShare).toBeGreaterThan(0.99);
			expect(s('gpt2', c).labelShare).toBeGreaterThan(0.9);
		}
	});

	it('Qwen: all 24 by real sentiment with right or half-wrong labels; follows flipped 23; made-up 23', () => {
		expect(s('qwen', 'correct').realSentiment).toBe(24);
		expect(s('qwen', 'half-wrong').realSentiment).toBe(24);
		expect(24 - s('qwen', 'flipped').realSentiment).toBe(23);
		expect(s('qwen', 'made-up').realSentiment).toBe(23);
	});

	it('GPT-2: 21 right, 17 with half wrong, and one label for every review when flipped or made up', () => {
		expect(s('gpt2', 'correct').realSentiment).toBe(21);
		expect(s('gpt2', 'half-wrong').realSentiment).toBe(17);
		expect(s('gpt2', 'flipped').sameForAll).toBe(true);
		expect(s('gpt2', 'made-up').sameForAll).toBe(true);
	});
});
