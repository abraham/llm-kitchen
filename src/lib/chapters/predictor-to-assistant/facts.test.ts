import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('base vs. instruct', () => {
	const data = readDataset('chat/base-vs-instruct');
	const p = (prompt: string) => data.prompts.find((x) => x.prompt === prompt)!;

	it('base Qwen turns "boil an egg" into a quiz', () => {
		expect(p('How do I boil an egg?').base.text).toMatch(/Options are/);
	});

	it('the instruct model without its template keeps going', () => {
		expect(p('What is the capital of France?').instructNoTemplate.text).toMatch(/Python/);
		expect(p('The cat sat on the').instructNoTemplate.text).toMatch(/You are an AI assistant/);
	});

	it('the instruct model in its chat format answers and stops', () => {
		const out = p('What is the capital of France?').instruct;
		expect(out).toEqual({ text: 'The capital of France is Paris.', stopped: true });
	});
});
