import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('steps and structure', () => {
	const d = readDataset('prompts/steps');
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
