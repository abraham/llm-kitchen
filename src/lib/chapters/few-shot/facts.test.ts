import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

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
});
