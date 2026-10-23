/** One character of text and the numbers a computer stores for it. */
export interface EncodedChar {
	char: string;
	codePoint: number;
	utf8: number[];
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
