import { describe, expect, it } from 'vitest';
import { oneAgent, SIZES, splitWork, totals } from './delegation.ts';

describe('delegation toy', () => {
	it('one agent reads a prompt that grows by a tool result every call', () => {
		const calls = oneAgent({ subtasks: 3, steps: 3 });
		expect(calls).toHaveLength(10);
		expect(calls.map((c) => c.prompt)).toEqual(
			Array.from({ length: 10 }, (_, k) => SIZES.start + k * SIZES.toolResult)
		);
		expect(totals(calls)).toEqual({ calls: 10, inARow: 10, largest: 1110, read: 7050 });
	});

	it('split work: two lead calls around one fresh loop per helper', () => {
		const calls = splitWork({ subtasks: 3, steps: 3 });
		expect(calls).toHaveLength(14);
		expect(calls[0]).toEqual({ who: 'lead', prompt: 300 });
		expect(calls.at(-1)).toEqual({ who: 'lead', prompt: 540 });
		expect(calls.filter((c) => c.helper === 1).map((c) => c.prompt)).toEqual([150, 240, 330, 420]);
		expect(totals(calls)).toEqual({ calls: 14, inARow: 6, largest: 540, read: 4260 });
	});

	it("one agent's total grows with the square of the work; split work's with the work", () => {
		const read = (subtasks: number) => ({
			one: totals(oneAgent({ subtasks, steps: 3 })).read,
			split: totals(splitWork({ subtasks, steps: 3 })).read
		});
		const [a, b, c] = [read(2), read(4), read(6)];
		// Equal steps in the number of subtasks add equal amounts for split work...
		expect(c.split - b.split).toBe(b.split - a.split);
		// ...and growing amounts for one agent.
		expect(c.one - b.one).toBeGreaterThan(b.one - a.one);
	});
});
