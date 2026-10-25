import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { oneAgent, SIZES, splitWork, totals } from '#lib/harness/delegation.ts';

describe('splitting the work', () => {
	const job = { subtasks: 3, steps: 3 };

	it('"one agent makes 10 calls and its last prompt is 1,110 tokens long"', () => {
		const one = totals(oneAgent(job));
		expect(one.calls).toBe(10);
		expect(one.largest).toBe(1110);
	});

	it('"there are 14 calls, but no prompt is over 540 tokens", and "only 6 calls wait"', () => {
		const split = totals(splitWork(job));
		expect(split.calls).toBe(14);
		expect(split.largest).toBe(540);
		expect(split.inARow).toBe(6);
	});

	it('"4,260 against 7,050" tokens read in all', () => {
		expect(totals(splitWork(job)).read).toBe(4260);
		expect(totals(oneAgent(job)).read).toBe(7050);
	});

	it('the made-up sizes are close to the agent loop’s recorded run', () => {
		const prompts = readDataset('agent/agent-cat').steps.map((s) => s.promptTokens);
		expect(Math.abs(prompts[0] - SIZES.start)).toBeLessThanOrEqual(5);
		const added = prompts.slice(1).map((p, i) => p - prompts[i]);
		for (const a of added) expect(Math.abs(a - SIZES.toolResult)).toBeLessThanOrEqual(5);
	});

	it('In depth: the two totals match their formulas', () => {
		const { start: p0, toolResult: a, helperStart: h, perSubtask: c } = SIZES;
		for (const N of [1, 3, 6]) {
			for (const s of [1, 3, 5]) {
				const K = N * s + 1;
				expect(totals(oneAgent({ subtasks: N, steps: s })).read).toBe(
					K * p0 + (a * K * (K - 1)) / 2
				);
				expect(totals(splitWork({ subtasks: N, steps: s })).read).toBe(
					2 * p0 + N * c + N * ((s + 1) * h + (a * s * (s + 1)) / 2)
				);
			}
		}
	});
});
