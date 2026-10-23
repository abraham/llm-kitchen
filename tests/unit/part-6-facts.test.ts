import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chatTemplate } from '../../src/lib/math/chat-template.ts';

const json = (name: string) => JSON.parse(readFileSync(`static/prompts/${name}.json`, 'utf8'));

describe('Ch 18: a prompt is the start of a document', () => {
	const d = json('wording');
	const variant = (text: string) =>
		d.groups
			.flatMap((g: { variants: unknown[] }) => g.variants)
			.find((v: { text: string }) => v.text === text);

	it('setting the scene moves the cat', () => {
		expect(variant('The cat sat on the').top[0].text).toBe(' floor');
		expect(variant('The cat sat on the').watch[' floor']).toBeCloseTo(0.076, 3);
		expect(variant('The cat sat on the').watch[' bed']).toBeCloseTo(0.065, 3);
		expect(variant('It was bedtime, and the cat sat on the').watch[' bed']).toBeCloseTo(0.218, 3);
		const beach = variant('At the beach, the cat sat on the');
		expect(variant('The cat sat on the').watch[' sand']).toBeLessThan(0.002);
		expect(beach.top.slice(0, 2).map((c: { text: string }) => c.text)).toContain(' sand');
	});

	it('starting the answer makes Paris about six times as likely as asking', () => {
		const ask = variant('What is the capital of France?');
		const start = variant('The capital of France is');
		expect(ask.top[0]).toMatchObject({ text: '\n' });
		expect(ask.top[0].p).toBeCloseTo(0.34, 2);
		expect(ask.watch[' Paris']).toBeLessThan(0.006);
		expect(Math.round(start.watch[' Paris'] / ask.watch[' Paris'])).toBe(6);
	});
});

describe('Ch 19: few-shot', () => {
	const d = json('fewshot');
	const task = (name: string) => d.tasks.find((t: { name: string }) => t.name === name);
	const p = (name: string, query: string, shots: number, model: 'qwen' | 'gpt2') =>
		task(name)
			.tests.find((t: { query: string }) => t.query === query)
			.runs.find((r: { shots: number }) => r.shots === shots)[model];

	it('Qwen goes from about 1% to 96% on "happy" with four examples', () => {
		expect(p('Opposites', 'happy', 0, 'qwen')).toBeLessThan(0.01);
		expect(p('Opposites', 'happy', 4, 'qwen')).toBeCloseTo(0.96, 2);
		expect(p('Opposites', 'light', 4, 'qwen')).toBeLessThan(p('Opposites', 'light', 1, 'qwen'));
	});

	it('the made-up labels go from almost nothing to 22–78%', () => {
		const t = task('Made-up labels');
		const four = t.tests.map(
			(x: { runs: { shots: number; qwen: number }[] }) => x.runs.find((r) => r.shots === 4)!.qwen
		);
		const zero = t.tests.map(
			(x: { runs: { shots: number; qwen: number }[] }) => x.runs.find((r) => r.shots === 0)!.qwen
		);
		expect(Math.max(...zero)).toBeLessThan(0.001);
		expect(Math.round(Math.min(...four) * 100)).toBe(22);
		expect(Math.round(Math.max(...four) * 100)).toBe(78);
	});

	it('GPT-2 repeats the word, or says "zork" after four examples', () => {
		for (const test of task('Opposites').tests.slice(0, 3)) {
			expect(test.runs.find((r: { shots: number }) => r.shots === 4).gpt2Top[0].text).toBe(
				` ${test.query}`
			);
		}
		for (const test of task('Made-up labels').tests) {
			expect(test.runs.find((r: { shots: number }) => r.shots === 4).gpt2Top[0].text).toBe(' z');
		}
	});

	it('one GPT-2 head looks almost only at the earlier answers', () => {
		for (const t of d.tasks) expect(t.head.score).toBeGreaterThan(0.9);
	});
});

describe('Ch 20: system prompts', () => {
	const d = json('system');

	it('the site’s chat template matches the recorded prompts', () => {
		for (const r of d.replies) {
			const text = chatTemplate([
				{ role: 'system', content: r.system },
				{ role: 'user', content: d.question }
			])
				.map((p) => p.text)
				.join('');
			expect(text).toBe(r.prompt);
		}
	});

	it('the persona makes the answer over twice as long; instructions make it shorter', () => {
		const [plain, persona, specific] = d.replies;
		expect(persona.tokens).toBeGreaterThan(2 * plain.tokens);
		expect(specific.tokens).toBeLessThan(plain.tokens);
		expect(persona.text).toContain('scattered away from us towards the edges of the sky');
	});

	it('the "never makes mistakes" persona got 3 of 8 sums right, the default 5', () => {
		type Row = { default: { correct: boolean }; persona: { correct: boolean } };
		expect(d.math.filter((m: Row) => m.default.correct)).toHaveLength(5);
		expect(d.math.filter((m: Row) => m.persona.correct)).toHaveLength(3);
	});
});

describe('Ch 21: steps and structure', () => {
	const d = json('steps');
	type Run = { correct: boolean; formatted: boolean; text: string };
	const runs = (i: number): Run[] => d.puzzles.map((p: { runs: Run[] }) => p.runs[i]);

	it('each way gets 4 of 6 right; the format was followed once', () => {
		for (let i = 0; i < 3; i++) expect(runs(i).filter((r) => r.correct)).toHaveLength(4);
		expect(runs(0).filter((r) => r.formatted)).toHaveLength(6);
		expect(runs(2).filter((r) => r.formatted)).toHaveLength(1);
	});

	it('the specific mistakes the chapter names', () => {
		const [bat, widgets, , , , apples] = d.puzzles;
		expect(bat.runs[0].text).toBe('0.10');
		expect(widgets.runs[1].text).toContain('0.2 minutes');
		expect(apples.runs[0].correct).toBe(false);
		expect(apples.runs[1].correct).toBe(true);
	});
});

describe('Ch 22: where prompts break', () => {
	const d = json('fragile');

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
			expect(m.position).toBeLessThan(positions.at(-1));
		}
	});
});
