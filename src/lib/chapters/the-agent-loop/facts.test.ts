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

	it('prompts of 301, 394, then 483 tokens; at most 8 calls', () => {
		expect(r.steps.map((s) => s.promptTokens)).toEqual([301, 394, 483]);
		expect(r.maxSteps).toBe(8);
	});
});
