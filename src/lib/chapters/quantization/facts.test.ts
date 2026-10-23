import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import canonical from '../../../../models/canonical.json';
import type { QuantizeRun } from '#lib/math/quantize.ts';

describe('fewer bits per number', () => {
	const run: QuantizeRun = readDataset('quantize/gpt2');
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
});
