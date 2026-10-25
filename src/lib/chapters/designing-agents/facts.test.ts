import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { designCost } from '#lib/harness/designs.ts';

describe('designing an agent', () => {
	it('deciding what to look up: the agent loop\'s run searched for just "cat", not the whole task', () => {
		const r = readDataset('agent/agent-cat');
		expect(r.steps[0].call).toEqual({ name: 'search_rhymes', arguments: { query: 'cat' } });
		expect(r.task).not.toBe('cat');
	});

	it('two tool calls: 3 calls and 1,170 tokens step by step; 2 calls and 660 or 780 otherwise', () => {
		expect([designCost('loop', 2).calls, designCost('loop', 2).read]).toEqual([3, 1170]);
		expect([designCost('code', 2).calls, designCost('code', 2).read]).toEqual([2, 660]);
		expect([designCost('plan', 2).calls, designCost('plan', 2).read]).toEqual([2, 780]);
	});

	it('six tool calls: the loop reads 3,990, the plan 1,140, the program still 660', () => {
		expect(['loop', 'plan', 'code'].map((d) => designCost(d as 'loop', 6).read)).toEqual([
			3990, 1140, 660
		]);
	});
});
