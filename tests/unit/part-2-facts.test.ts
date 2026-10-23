// Checks that the numbers and examples in the Part II prose match the data the widgets show.
import { describe, expect, it } from 'vitest';
import { encodeText } from '../../src/lib/math/encoding.ts';

describe('Ch 3: text is just numbers', () => {
	const cp = (s: string) => encodeText(s)[0].codePoint;

	it('"T is 84, h is 104, a space is 32, é is 233, 🐱 is 128,049"', () => {
		expect([cp('T'), cp('h'), cp(' '), cp('é'), cp('🐱')]).toEqual([84, 104, 32, 233, 128049]);
	});

	it('"room for more than a million characters" (U+0000 to U+10FFFF)', () => {
		expect(0x10ffff + 1).toBeGreaterThan(1_000_000);
	});
});
