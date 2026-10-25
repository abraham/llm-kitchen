import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { DATASETS, type AgentRunName } from '#lib/datasets/registry.ts';
import { parseToolCall, segmentPrompt } from './agent.ts';
import {
	CALCULATOR_SCHEMA,
	FakeFiles,
	calculator,
	countWords,
	runTool,
	simpleCall
} from './tools.ts';

const runs = Object.keys(DATASETS)
	.filter((id) => id.startsWith('agent/') && id !== 'agent/context' && id !== 'agent/grades')
	.map((id) => ({ name: id, run: readDataset(`agent/${id.slice(6) as AgentRunName}`) }));

describe('toy tools', () => {
	it('calculator does arithmetic without eval', () => {
		expect(calculator('1234 * 5678')).toBe('7006652');
		expect(calculator('1234 × 5678')).toBe('7006652');
		expect(calculator('(2 + 3) * -4 / 8')).toBe('-2.5');
		expect(calculator('1 / 3')).toBe('0.3333333333');
		expect(calculator('alert(1)')).toMatch(/^Error/);
		expect(calculator('2 ** 8')).toMatch(/^Error/);
		expect(calculator('1 / 0')).toMatch(/^Error/);
	});

	it('counts words like the recording script', () => {
		expect(countWords("Humpty Dumpty couldn't fall")).toBe('4');
	});

	it('gives the same results as the tools used for every recorded call', () => {
		for (const { name, run } of runs) {
			const files = new FakeFiles();
			for (const step of run.steps) {
				if (!step.call || step.blocked) continue;
				const offered = run.tools.some((t) => t.name === step.call!.name);
				const expected = offered
					? runTool(step.call, files)
					: `Error: there is no tool named ${step.call.name}.`;
				expect(step.result, `${name}: ${step.call.name}`).toBe(expected);
			}
			expect(files.names, name).toEqual(run.files.after);
		}
	});

	it('shows calls in the simplified format', () => {
		expect(simpleCall({ name: 'calculator', arguments: { expression: '1234 * 5678' } })).toBe(
			'<call calculator>1234 * 5678</call>'
		);
		expect(simpleCall({ name: 'list_files', arguments: {} })).toBe('<call list_files></call>');
	});
});

describe('segmentPrompt', () => {
	it('splits every recorded prompt without losing a character', () => {
		for (const { name, run } of runs) {
			for (const step of run.steps) {
				expect(
					segmentPrompt(step.prompt)
						.map((p) => p.text)
						.join(''),
					name
				).toBe(step.prompt);
			}
		}
	});

	it('labels the parts of the the-model-is-not-the-product prompt', () => {
		const chat = runs.find((r) => r.name === 'agent/chat')!.run;
		const parts = segmentPrompt(chat.steps[0].prompt);
		const text = (kind: string) =>
			parts
				.filter((p) => p.kind === kind)
				.map((p) => p.text)
				.join('');
		expect(text('system')).toBe(chat.system);
		expect(text('tools')).toContain('"name": "calculator"');
		expect(text('history')).toContain(chat.history[0].content);
		expect(text('message')).toBe(chat.task);

		const second = segmentPrompt(chat.steps[1].prompt);
		expect(second.some((p) => p.kind === 'call')).toBe(true);
		expect(second.some((p) => p.kind === 'result')).toBe(true);
		expect(second.filter((p) => p.kind === 'message').map((p) => p.text)).toEqual([chat.task]);
	});
});

describe('parseToolCall', () => {
	it('reads every recorded step as the recording harness did', () => {
		for (const { name, run } of runs) {
			for (const step of run.steps) {
				const parsed = parseToolCall(step.output);
				expect(parsed.thought, name).toBe(step.thought);
				expect(parsed.call, name).toEqual(step.call);
			}
		}
	});

	it('treats a broken call as no call', () => {
		expect(parseToolCall('<tool_call>\n{"name": calc}\n</tool_call>').call).toBeUndefined();
		expect(parseToolCall('<tool_call>{"arguments": {}}</tool_call>').call).toBeUndefined();
		expect(parseToolCall('Sure. <tool_call>{"name": "calculator"}</tool_call>')).toEqual({
			thought: 'Sure.',
			call: { name: 'calculator', arguments: {} }
		});
	});

	it('lists the calculator to the model as the recorded runs did', () => {
		const recorded = readDataset('agent/math-tools').tools[0];
		expect(CALCULATOR_SCHEMA.function.name).toBe(recorded.name);
		expect(CALCULATOR_SCHEMA.function.description).toBe(recorded.description);
	});
});
