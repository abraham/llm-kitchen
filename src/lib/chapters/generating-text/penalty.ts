/** Each token of a reply, marked when the same token already appeared earlier in it. */
export function markRepeats(tokens: readonly string[]): { text: string; repeat: boolean }[] {
	const seen = new Set<string>();
	return tokens.map((text) => {
		const repeat = seen.has(text);
		seen.add(text);
		return { text, repeat };
	});
}
