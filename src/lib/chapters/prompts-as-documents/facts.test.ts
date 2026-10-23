import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';

describe('a prompt is the start of a document', () => {
	const d = readDataset('prompts/wording');
	const variant = (text: string) =>
		d.groups.flatMap((g) => g.variants).find((v) => v.text === text)!;

	it('setting the scene moves the cat', () => {
		expect(variant('The cat sat on the').top[0].text).toBe(' floor');
		expect(variant('The cat sat on the').watch[' floor']).toBeCloseTo(0.076, 3);
		expect(variant('The cat sat on the').watch[' bed']).toBeCloseTo(0.065, 3);
		expect(variant('It was bedtime, and the cat sat on the').watch[' bed']).toBeCloseTo(0.218, 3);
		const beach = variant('At the beach, the cat sat on the');
		expect(variant('The cat sat on the').watch[' sand']).toBeLessThan(0.002);
		expect(beach.top.slice(0, 2).map((c) => c.text)).toContain(' sand');
	});

	it('starting the answer makes Paris about six times as likely as asking', () => {
		const ask = variant('What is the capital of France?');
		const start = variant('The capital of France is');
		expect(ask.top[0]).toMatchObject({ text: '\n' });
		expect(ask.top[0].p).toBeCloseTo(0.34, 2);
		expect(ask.watch[' Paris']).toBeLessThan(0.006);
		expect(Math.round(start.watch[' Paris'] / ask.watch[' Paris'])).toBe(6);
	});
});
