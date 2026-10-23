import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { segmentPrompt, type AgentRun } from './agent.ts';
import { FakeFiles, calculator, countWords, runTool, simpleCall } from './tools.ts';

const runs = readdirSync('static/agent')
	.filter((f) => f.endsWith('.json') && f !== 'context.json')
	.map((f) => ({
		name: f,
		run: JSON.parse(readFileSync(`static/agent/${f}`, 'utf8')) as AgentRun
	}));

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

	it('labels the parts of the Ch 15 prompt', () => {
		const chat = runs.find((r) => r.name === 'chat.json')!.run;
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
