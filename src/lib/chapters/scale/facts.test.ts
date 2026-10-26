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

	it('In depth: 6ND for GPT-3 is about 3.15 × 10²³, next to the reported 3.14', () => {
		const c = 6 * by('GPT-3').parameters * by('GPT-3').trainingTokens!;
		expect(Math.round(c / 1e21) / 100).toBe(3.15);
		expect(by('GPT-3').flops).toBeCloseTo(3.14e23, -21);
	});

	it('In depth: GPT-2 small on 10 billion tokens is about 7.5 × 10¹⁸, about 5 million times fewer than Llama 3', () => {
		const c = 6 * canonical.parameters * 10e9;
		expect(Math.round(c / 1e17) / 10).toBe(7.5);
		expect(Math.round(by('Llama 3 (largest)').flops! / c / 1e6)).toBe(5);
	});

	it('In depth: ten times the weights multiplies the loss by about 0.84, "about 16% lower"', () => {
		expect(Math.round(10 ** -0.076 * 100) / 100).toBe(0.84);
		expect(Math.round((1 - 10 ** -0.076) * 100)).toBe(16);
	});

	it('In depth: the Chinchilla fit predicts 1.94 for Chinchilla and 1.99 for Gopher', () => {
		const fit = (n: number, d: number) => 1.69 + 406.4 / n ** 0.34 + 410.7 / d ** 0.28;
		const loss = (name: string) =>
			Math.round(fit(by(name).parameters, by(name).trainingTokens!) * 100) / 100;
		expect(loss('Chinchilla')).toBe(1.94);
		expect(loss('Gopher')).toBe(1.99);
	});
});
