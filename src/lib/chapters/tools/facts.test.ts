import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type AgentRunName } from '#lib/datasets/registry.ts';
import type { AgentRun } from '#lib/harness/agent.ts';
import { calculator } from '#lib/harness/tools.ts';
const run = (name: AgentRunName): AgentRun => readDataset(`agent/${name}`);
const calls = (r: AgentRun) => r.steps.filter((s) => s.call).map((s) => s.call!.name);

describe('tools', () => {
	it('without tools: 7,050,952; the right answer is 7,006,652', () => {
		expect(run('math-no-tools').steps[0].output).toContain('7,050,952');
		expect(calculator('1234 * 5678')).toBe('7006652');
	});

	it('with a calculator, the answer is right', () => {
		const r = run('math-tools');
		expect(calls(r)).toEqual(['calculator']);
		expect(r.steps.at(-1)!.thought).toContain('7006652');
	});
});
