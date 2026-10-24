import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { type AgentRunName } from '#lib/datasets/registry.ts';
import { segmentPrompt, type AgentRun } from '#lib/harness/agent.ts';
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

	it('in depth: the tool descriptions are most of the prompt; your message is the last user turn', () => {
		const parts = segmentPrompt(chat.steps[0].prompt);
		const chars = (kind: string) =>
			parts.filter((p) => p.kind === kind).reduce((a, p) => a + p.text.length, 0);
		expect(chat.tools).toHaveLength(3);
		expect(chars('tools') / chat.steps[0].prompt.length).toBeGreaterThan(0.7);
		expect(parts.find((p) => p.kind === 'message')!.text).toBe(chat.task);
	});

	it('in depth: the second call added 93 tokens, with the result in <tool_response> tags', () => {
		const [first, second] = chat.steps;
		expect(second.promptTokens - first.promptTokens).toBe(93);
		const added = second.prompt.slice(first.prompt.length);
		expect(added).toContain('<tool_response>');
		expect(second.prompt).toContain(first.output);
	});
});
