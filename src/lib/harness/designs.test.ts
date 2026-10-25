import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { DESIGN_SIZES, designCost } from './designs.ts';

describe('designCost', () => {
	it('two steps: the loop makes 3 calls reading 1,170; code 2 reading 660; a plan 2 reading 780', () => {
		expect(designCost('loop', 2)).toMatchObject({ calls: 3, read: 1170 });
		expect(designCost('code', 2)).toMatchObject({ calls: 2, read: 660 });
		expect(designCost('plan', 2)).toMatchObject({ calls: 2, read: 780 });
	});

	it('six steps: the loop grows with the square, the others hardly at all', () => {
		expect(designCost('loop', 6).read).toBe(3990);
		expect(designCost('code', 6).read).toBe(660);
		expect(designCost('plan', 6).read).toBe(1140);
	});

	it('only the loop sees each result; only code runs what the model wrote', () => {
		expect(['loop', 'code', 'plan'].map((d) => designCost(d as 'loop', 3).seesEachResult)).toEqual([
			true,
			false,
			false
		]);
		expect(['loop', 'code', 'plan'].map((d) => designCost(d as 'loop', 3).runsModelCode)).toEqual([
			false,
			true,
			false
		]);
	});

	it('the made-up sizes are within 10 tokens of the recorded run', () => {
		const run = readDataset('agent/agent-cat');
		const prompts = run.steps.map((s) => s.promptTokens);
		expect(Math.abs(prompts[0] - DESIGN_SIZES.start)).toBeLessThanOrEqual(10);
		const added = prompts.slice(1).map((p, i) => p - prompts[i]);
		for (const a of added) expect(Math.abs(a - DESIGN_SIZES.toolResult)).toBeLessThanOrEqual(10);
		expect(
			Math.abs(designCost('loop', 2).read - prompts.reduce((a, b) => a + b, 0))
		).toBeLessThanOrEqual(10);
	});
});
