import { describe, expect, it } from 'vitest';
import { codePointLabel, encodeText, hexByte } from './encoding.ts';

describe('encodeText', () => {
	it('gives ASCII letters one byte equal to their code point', () => {
		expect(encodeText('The')).toEqual([
			{ char: 'T', codePoint: 84, utf8: [84] },
			{ char: 'h', codePoint: 104, utf8: [104] },
			{ char: 'e', codePoint: 101, utf8: [101] }
		]);
		expect(encodeText(' ')[0].codePoint).toBe(32);
	});

	it('uses two bytes for é and four for an emoji (as the chapter says)', () => {
		const [e] = encodeText('é');
		expect(codePointLabel(e.codePoint)).toBe('U+00E9');
		expect(e.utf8.map(hexByte)).toEqual(['C3', 'A9']);

		const [cat] = encodeText('🐱');
		expect(codePointLabel(cat.codePoint)).toBe('U+1F431');
		expect(cat.utf8.map(hexByte)).toEqual(['F0', '9F', '90', 'B1']);
	});

	it('treats a surrogate pair as one character', () => {
		expect(encodeText('a🐱b')).toHaveLength(3);
	});
});
