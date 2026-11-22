import { describe, expect, it } from 'vitest';
import {
	annotateUtf8,
	codePointLabel,
	describeByte,
	diffBytes,
	encodeText,
	hexByte
} from './encoding.ts';

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

describe('annotateUtf8', () => {
	it('splits prefix and payload bits for 1-, 2-, 3-, and 4-byte characters', () => {
		const bytes = annotateUtf8('Té中🐱');
		expect(bytes.map((b) => [b.hex, b.role, b.prefixBits, b.payloadBits])).toEqual([
			['54', 'ascii', '0', '1010100'],
			['C3', 'lead', '110', '00011'],
			['A9', 'continuation', '10', '101001'],
			['E4', 'lead', '1110', '0100'],
			['B8', 'continuation', '10', '111000'],
			['AD', 'continuation', '10', '101101'],
			['F0', 'lead', '11110', '000'],
			['9F', 'continuation', '10', '011111'],
			['90', 'continuation', '10', '010000'],
			['B1', 'continuation', '10', '110001']
		]);
		// Reassembling payload bits recovers each code point.
		expect(parseInt(bytes[1].payloadBits + bytes[2].payloadBits, 2)).toBe(233);
		expect(
			parseInt(
				bytes
					.slice(6, 10)
					.map((b) => b.payloadBits)
					.join(''),
				2
			)
		).toBe(128_049);
	});
});

describe('diffBytes', () => {
	it('replaces one ASCII byte with two UTF-8 bytes for cafe → café', () => {
		const diff = diffBytes(annotateUtf8('cafe'), annotateUtf8('café'));
		expect(diff.map((d) => `${d.kind}:${d.byte.hex}`)).toEqual([
			'same:63',
			'same:61',
			'same:66',
			'removed:65',
			'added:C3',
			'added:A9'
		]);
		expect(describeByte(diff[4])).toContain('lead byte 1 of 2');
		expect(describeByte(diff[5])).toContain('continuation byte 2 of 2');
	});

	it('replaces three ASCII bytes with four emoji bytes for The cat → The 🐱', () => {
		const diff = diffBytes(annotateUtf8('The cat'), annotateUtf8('The 🐱'));
		expect(diff.filter((d) => d.kind === 'same').map((d) => d.byte.hex)).toEqual([
			'54',
			'68',
			'65',
			'20'
		]);
		expect(diff.filter((d) => d.kind === 'removed').map((d) => d.byte.hex)).toEqual([
			'63',
			'61',
			'74'
		]);
		expect(diff.filter((d) => d.kind === 'added').map((d) => d.byte.hex)).toEqual([
			'F0',
			'9F',
			'90',
			'B1'
		]);
	});

	it('diffs an in-place single-byte edit for The cat → The mat', () => {
		const diff = diffBytes(annotateUtf8('The cat'), annotateUtf8('The mat'));
		expect(diff.filter((d) => d.kind !== 'same').map((d) => `${d.kind}:${d.byte.hex}`)).toEqual([
			'removed:63',
			'added:6D'
		]);
	});
});
