import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import canonical from '../../../../models/canonical.json';

describe('LoRA on one GPT-2 table', () => {
	const d = canonical.embeddingSize;

	it('"a 768 × 768 table: 589,824 weights"; "768 × 8 and 8 × 768 hold 12,288, about 2%"', () => {
		expect(d).toBe(768);
		expect(d * d).toBe(589_824);
		expect(d * 8 + 8 * d).toBe(12_288);
		expect(Math.round((100 * 12_288) / 589_824)).toBe(2);
	});
});

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

describe('In depth', () => {
	it('the reward loss is small when the preferred answer scores clearly higher', () => {
		const loss = (gap: number) => -Math.log(1 / (1 + Math.exp(-gap)));
		expect(loss(0)).toBeCloseTo(Math.log(2), 12);
		expect(loss(4)).toBeLessThan(0.02);
		expect(loss(-4)).toBeGreaterThan(4);
	});

	it('with B at all zeros, W + (alpha / r) B A is exactly W', () => {
		const W = [
			[0.3, -0.7],
			[1.2, 0.4]
		];
		const B = [[0], [0]];
		const A = [[0.9, -1.1]];
		const BA = B.map((row) => A[0].map((a) => row[0] * a));
		const updated = W.map((row, i) => row.map((w, j) => w + (16 / 1) * BA[i][j]));
		expect(updated).toEqual(W);
	});
});
