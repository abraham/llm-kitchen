/** One character of text and the numbers a computer stores for it. */
export interface EncodedChar {
	char: string;
	codePoint: number;
	utf8: number[];
}

export type ByteRole = 'ascii' | 'lead' | 'continuation';

/** One byte of a UTF-8 stream, linked back to its character and bit layout. */
export interface AnnotatedByte {
	index: number;
	byte: number;
	hex: string;
	bits: string;
	prefixBits: string;
	payloadBits: string;
	role: ByteRole;
	char: string;
	charIndex: number;
	codePoint: number;
	byteInChar: number;
	charByteLength: number;
}

export type ByteDiffKind = 'same' | 'removed' | 'added';

export interface ByteDiffItem {
	kind: ByteDiffKind;
	byte: AnnotatedByte;
	beforeIndex?: number;
}

const encoder = new TextEncoder();

/** Split text into Unicode code points with their UTF-8 bytes. */
export function encodeText(text: string): EncodedChar[] {
	return Array.from(text, (char) => ({
		char,
		codePoint: char.codePointAt(0)!,
		utf8: [...encoder.encode(char)]
	}));
}

export function codePointLabel(cp: number): string {
	return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function hexByte(b: number): string {
	return b.toString(16).toUpperCase().padStart(2, '0');
}

export function hexOffset(offset: number): string {
	return `0x${offset.toString(16).toUpperCase().padStart(2, '0')}`;
}

/** Expand text into UTF-8 bytes with each byte's role, prefix/payload bits, and owning character. */
export function annotateUtf8(text: string): AnnotatedByte[] {
	const chars = encodeText(text);
	const out: AnnotatedByte[] = [];
	let index = 0;
	for (let charIndex = 0; charIndex < chars.length; charIndex++) {
		const { char, codePoint, utf8 } = chars[charIndex];
		const len = utf8.length;
		for (let j = 0; j < len; j++) {
			const byte = utf8[j];
			const bits = byte.toString(2).padStart(8, '0');
			let role: ByteRole;
			let prefixLen: number;
			if (len === 1) {
				role = 'ascii';
				prefixLen = 1;
			} else if (j === 0) {
				role = 'lead';
				prefixLen = len + 1;
			} else {
				role = 'continuation';
				prefixLen = 2;
			}
			out.push({
				index: index++,
				byte,
				hex: hexByte(byte),
				bits,
				prefixBits: bits.slice(0, prefixLen),
				payloadBits: bits.slice(prefixLen),
				role,
				char,
				charIndex,
				codePoint,
				byteInChar: j + 1,
				charByteLength: len
			});
		}
	}
	return out;
}

/** Longest-common-subsequence diff between two byte streams, grouping removals before additions. */
export function diffBytes(
	before: readonly AnnotatedByte[],
	after: readonly AnnotatedByte[]
): ByteDiffItem[] {
	const m = before.length;
	const n = after.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			dp[i][j] =
				before[i].byte === after[j].byte
					? 1 + dp[i + 1][j + 1]
					: Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const items: ByteDiffItem[] = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (before[i].byte === after[j].byte) {
			items.push({ kind: 'same', byte: after[j], beforeIndex: before[i].index });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			items.push({ kind: 'removed', byte: before[i] });
			i++;
		} else {
			items.push({ kind: 'added', byte: after[j] });
			j++;
		}
	}
	while (i < m) items.push({ kind: 'removed', byte: before[i++] });
	while (j < n) items.push({ kind: 'added', byte: after[j++] });
	return items;
}

export function charDisplayName(char: string): string {
	return char === ' ' ? 'space' : `“${char}”`;
}

/** Plain-English explanation of one byte in the diff, used for the live status readout. */
export function describeByte(item: ByteDiffItem): string {
	const { byte: b, kind } = item;
	const name = charDisplayName(b.char);
	const status =
		kind === 'removed'
			? `Removed from offset ${hexOffset(b.index)}`
			: kind === 'added'
				? `Added at offset ${hexOffset(b.index)}`
				: `Unchanged at offset ${hexOffset(b.index)}`;

	if (b.role === 'ascii') {
		return `${status}: ${b.hex} (${b.byte}), plain ASCII byte for ${name}. Starts with 0, so it stands on its own.`;
	}
	if (b.role === 'lead') {
		const follow = b.charByteLength - 1;
		return `${status}: ${b.hex} (${b.byte}), lead byte 1 of ${b.charByteLength} for ${name}. Starts with ${b.prefixBits}, so ${follow} continuation ${follow === 1 ? 'byte follows' : 'bytes follow'}.`;
	}
	return `${status}: ${b.hex} (${b.byte}), continuation byte ${b.byteInChar} of ${b.charByteLength} for ${name}. Starts with 10 (value ${b.byte}, in 128–191), carrying 6 more bits.`;
}
