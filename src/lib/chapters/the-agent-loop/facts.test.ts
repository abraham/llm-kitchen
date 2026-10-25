import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type AgentRunName } from '#lib/datasets/registry.ts';
import type { AgentRun } from '#lib/harness/agent.ts';
const run = (name: AgentRunName): AgentRun => readDataset(`agent/${name}`);
const calls = (r: AgentRun) => r.steps.filter((s) => s.call).map((s) => s.call!.name);

describe('the agent loop', () => {
	const r = run('agent-cat');
	it('search, count, answer: 30 words', () => {
		expect(calls(r)).toEqual(['search_rhymes', 'count_words']);
		expect(r.steps[1].result).toBe('30');
		expect(r.steps.at(-1)!.thought).toContain('30 words');
	});

	it('deciding what to look up: it searched for just "cat", not the whole task', () => {
		expect(r.steps[0].call).toEqual({ name: 'search_rhymes', arguments: { query: 'cat' } });
		expect(r.task).not.toBe('cat');
	});

	it('prompts of 301, 394, then 483 tokens; at most 8 calls', () => {
		expect(r.steps.map((s) => s.promptTokens)).toEqual([301, 394, 483]);
		expect(r.maxSteps).toBe(8);
	});

	it('In depth: "1,178 tokens" in all, "each step added about 90", as the formula says', () => {
		const prompts = r.steps.map((s) => s.promptTokens);
		const total = prompts.reduce((a, b) => a + b, 0);
		expect(total).toBe(1178);
		const added = prompts.slice(1).map((p, i) => p - prompts[i]);
		for (const a of added) expect(Math.abs(a - 90)).toBeLessThanOrEqual(5);
		// K p0 + a K(K-1)/2 with the average step size comes within a few tokens of the total.
		const K = prompts.length;
		const a = (prompts[K - 1] - prompts[0]) / (K - 1);
		expect(Math.abs(K * prompts[0] + (a * K * (K - 1)) / 2 - total)).toBeLessThanOrEqual(5);
	});
});
