import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import canonical from '../../../../models/canonical.json';
import { levels, weightBytes, type QuantizeRun } from '#lib/math/quantize.ts';

describe('fewer bits per number', () => {
	const run: QuantizeRun = readDataset('quantize/precisions');
	const at = (label: string) => run.precisions.find((p) => p.label === label)!;
	const text = (label: string) =>
		at(label)
			.generated.map((t) => t.text)
			.join('');
	const top = (label: string) => at(label).candidates[0].token.text;

	it('records GPT-2 small at 32, 16, 8, 6, 5, 4, 3, and 2 bits', () => {
		expect(run.parameters).toBe(canonical.parameters);
		expect(run.precisions.map((p) => p.bits)).toEqual([32, 16, 8, 6, 5, 4, 3, 2]);
		expect(Math.round(at('32-bit').bytes / 1e6)).toBe(498);
		expect(Math.round(at('16-bit').bytes / 1e6)).toBe(249);
	});

	it('holds at 16 and 8 bits: same top guess, same 12 tokens, nearly the same loss', () => {
		for (const label of ['16-bit', '8-bit']) {
			expect(top(label)).toBe(' floor');
			expect(text(label)).toBe(text('32-bit'));
		}
		expect(at('32-bit').generated).toHaveLength(12);
		expect(
			[at('32-bit').loss, at('16-bit').loss, at('8-bit').loss].map((l) => l.toFixed(2))
		).toEqual(['3.31', '3.31', '3.34']);
	});

	it('drifts at 6 and 5 bits (" bed", then " table") and breaks at 4 and below', () => {
		expect([top('6-bit'), top('5-bit')]).toEqual([' bed', ' table']);
		expect(text('4-bit')).toMatch(/^ stack\. The stack\./);
		expect(['4-bit', '3-bit', '2-bit'].map((l) => Math.round(at(l).loss))).toEqual([6, 18, 48]);
	});

	it('In depth: m = 0.689 gives a 4-bit step of about 0.098; anything under 0.049 becomes 0', () => {
		expect(run.sample.max).toBeCloseTo(0.689, 3);
		const step = levels(4, run.sample.max)[1] - levels(4, run.sample.max)[0];
		expect(step).toBeCloseTo(run.sample.max / 7, 12);
		expect(Math.round(step * 1000) / 1000).toBe(0.098);
		expect(Math.round((step / 2) * 1000) / 1000).toBe(0.049);
		expect(Math.round(0.048 / step)).toBe(0);
	});

	it('In depth: "4-bit" is about 4.5 bits per weight, 70 MB rather than 62', () => {
		expect(Math.round(((at('4-bit').bytes * 8) / run.parameters) * 10) / 10).toBe(4.5);
		expect(Math.round(at('4-bit').bytes / 1e6)).toBe(70);
		expect(Math.round(weightBytes(run.parameters, 4) / 1e6)).toBe(62);
		expect(run.block).toBe(32);
		expect(run.scaleBits / run.block).toBe(0.5);
	});

	it('Bonsai 8B: 8.19 billion weights at 1.125 bits is 1.15 GB, against 16.4 GB at 16 bits', () => {
		const bits = 1 + 16 / 128;
		expect(bits).toBe(1.125);
		expect((weightBytes(8.19e9, bits) / 1e9).toFixed(2)).toBe('1.15');
		expect((weightBytes(8.19e9, 16) / 1e9).toFixed(1)).toBe('16.4');
	});
});
