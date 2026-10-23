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
