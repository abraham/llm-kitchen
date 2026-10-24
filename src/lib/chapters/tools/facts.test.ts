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

	it('in depth: only the last of the four rows is right, and the rows add up to 6,946,772', () => {
		const out = run('math-no-tools').steps[0].output;
		const rows = [98072, 61700, 617000, 6170000];
		for (const n of rows) expect(out).toContain(String(n));
		const truth = [1234 * 8, 1234 * 70, 1234 * 600, 1234 * 5000];
		expect(rows.map((n, i) => n === truth[i])).toEqual([false, false, false, true]);
		expect(truth).toEqual([9872, 86380, 740400, 6170000]);
		expect(rows.reduce((a, b) => a + b)).toBe(6946772);
	});

	it('in depth: the call Qwen wrote between <tool_call> tags', () => {
		expect(run('math-tools').steps[0].output).toBe(
			'<tool_call>\n{"name": "calculator", "arguments": {"expression": "1234 * 5678"}}\n</tool_call>'
		);
	});
});
