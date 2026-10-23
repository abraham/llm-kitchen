import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type AgentRunName } from '#lib/datasets/registry.ts';
import type { AgentRun } from '#lib/harness/agent.ts';
const run = (name: AgentRunName): AgentRun => readDataset(`agent/${name}`);
const calls = (r: AgentRun) => r.steps.filter((s) => s.call).map((s) => s.call!.name);

describe('the model is not the product', () => {
	const chat = run('chat');
	it('a 31-character message became a 400-token prompt, then 493', () => {
		expect(chat.task).toHaveLength(31);
		expect(chat.steps.map((s) => s.promptTokens)).toEqual([400, 493]);
	});

	it('the model looked up a rhyme before answering', () => {
		expect(calls(chat)).toEqual(['search_rhymes']);
		expect(chat.finished).toBe(true);
	});
});
