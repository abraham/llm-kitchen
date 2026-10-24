import { describe, expect, it } from 'vitest';
import { encodeText } from '#lib/math/encoding.ts';

describe('text is just numbers', () => {
	const cp = (s: string) => encodeText(s)[0].codePoint;

	it('"T is 84, h is 104, a space is 32, é is 233, 🐱 is 128,049"', () => {
		expect([cp('T'), cp('h'), cp(' '), cp('é'), cp('🐱')]).toEqual([84, 104, 32, 233, 128049]);
	});

	it('"room for more than a million characters" (U+0000 to U+10FFFF)', () => {
		expect(0x10ffff + 1).toBeGreaterThan(1_000_000);
	});

	it('In depth: numbers run "from 0 to 1,114,111"', () => {
		expect(0x10ffff).toBe(1_114_111);
	});

	it('In depth: one byte below 128, two below 2,048, three below 65,536, four for the rest', () => {
		const bytes = (c: number) => encodeText(String.fromCodePoint(c))[0].utf8.length;
		const cases = [
			[0, 1],
			[127, 1],
			[128, 2],
			[2047, 2],
			[2048, 3],
			[65_535, 3],
			[65_536, 4],
			[0x10ffff, 4]
		];
		for (const [c, n] of cases) expect(bytes(c), String(c)).toBe(n);
	});

	it('In depth: two-byte formula gives "195 and 169" for é (233)', () => {
		const c = 233;
		const formula = [192 + Math.floor(c / 64), 128 + (c % 64)];
		expect(formula).toEqual([195, 169]);
		expect(encodeText('é')[0].utf8).toEqual(formula);
	});

	it('In depth: English stays ASCII, and every later byte is 128 to 191', () => {
		for (const ch of encodeText('The cat sat on the mat.')) expect(ch.utf8).toEqual([ch.codePoint]);
		for (const ch of encodeText('é中🐱')) {
			for (const b of ch.utf8.slice(1)) expect(b >= 128 && b <= 191, ch.char).toBe(true);
			expect(ch.utf8[0] < 128 || ch.utf8[0] >= 192, ch.char).toBe(true);
		}
	});
});
