import { describe, expect, it } from 'vitest';
import canonical from '../../../../models/canonical.json';
import { label } from '#lib/curriculum/index.ts';
import { SCALE, TINY_TRAINING_EXAMPLES, kaplanLoss } from '#lib/chapters/scale/data.ts';

describe('scale', () => {
	const by = (name: string) => SCALE.find((e) => e.name === name)!;

	it('GPT-3 is more than 1,000 times GPT-2 small', () => {
		expect(by('GPT-3').parameters / canonical.parameters).toBeGreaterThan(1000);
	});

	it('Chinchilla ≈ 20 and Llama 3 ≈ 39 training tokens per weight', () => {
		const ratio = (e: string) => by(e).trainingTokens! / by(e).parameters;
		expect(Math.round(ratio('Chinchilla'))).toBe(20);
		expect(Math.round(ratio('Llama 3 (largest)'))).toBe(39);
	});

	it('Chinchilla and Gopher used the same compute', () => {
		expect(by('Chinchilla').flops).toBe(by('Gopher').flops);
	});

	it('the tiny model has 3,790 weights and reads 192,000 characters', () => {
		expect(by(`${label('learning-from-mistakes')} tiny model`).parameters).toBe(3790);
		expect(TINY_TRAINING_EXAMPLES).toBe(192_000);
	});

	it('the scaling formula drops by the same fraction for each tenfold increase', () => {
		const r1 = kaplanLoss(1e7) / kaplanLoss(1e6);
		const r2 = kaplanLoss(1e9) / kaplanLoss(1e8);
		expect(r1).toBeCloseTo(r2, 10);
		expect(r1).toBeCloseTo(10 ** -0.076, 10);
	});
});
