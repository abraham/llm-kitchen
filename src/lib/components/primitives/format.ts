/** Show whitespace in tokens so " sat" and "sat" look different. */
export function displayToken(text: string): string {
	return text.replaceAll(' ', '·').replaceAll('\n', '↵').replaceAll('\t', '⇥');
}

/** A screen-reader description of a token, e.g. `"space sat", token 3332`. */
export function describeToken(text: string, id?: number): string {
	const spoken = text
		.replaceAll(' ', ' space ')
		.replaceAll('\n', ' newline ')
		.replace(/\s+/g, ' ')
		.trim();
	return id === undefined ? `"${spoken}"` : `"${spoken}", token ${id}`;
}

export function formatPercent(p: number): string {
	if (p > 0 && p < 0.001) return '<0.1%';
	const rounded = Math.round(p * 10000) / 10000;
	return `${(rounded * 100).toFixed(rounded < 0.1 ? 1 : 0)}%`;
}

/** A whole number with thousands separators, e.g. `151,936`. */
export function formatCount(n: number): string {
	return Math.round(n).toLocaleString('en-US');
}

/** A decimal with a real minus sign, and no sign when it rounds to zero, e.g. `−0.42`. */
export function formatSigned(v: number, digits = 2): string {
	const abs = Math.abs(v).toFixed(digits);
	return (v < 0 && Number(abs) !== 0 ? '−' : '') + abs;
}
