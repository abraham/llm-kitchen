export interface Part {
	key: PartKey;
	/** Roman numeral from the Part's position, or null for the closing wrap-up. */
	number: string | null;
	title: string;
}

/** The Parts in reading order. Numbered Parts get Roman numerals in this order. */
const ORDER = [
	['prediction', 'Prediction'],
	['representation', 'Representation'],
	['learning', 'Learning'],
	['context', 'Context'],
	['together', 'Putting it together'],
	['prompting', 'Prompt engineering'],
	['harnesses', 'Harnesses'],
	['agents', 'Tools and agents'],
	['others', 'Other kinds of models'],
	['wrapup', 'Wrap-up']
] as const;

export type PartKey = (typeof ORDER)[number][0];

const UNNUMBERED: ReadonlySet<PartKey> = new Set(['wrapup']);

function roman(n: number): string {
	const numerals: [number, string][] = [
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];
	let out = '';
	for (const [value, numeral] of numerals) {
		for (; n >= value; n -= value) out += numeral;
	}
	return out;
}

export const PARTS: readonly Part[] = ORDER.map(([key, title], i) => ({
	key,
	number: UNNUMBERED.has(key) ? null : roman(i + 1),
	title
}));

export function part(key: PartKey): Part {
	return PARTS.find((p) => p.key === key)!;
}

/** "Part IX: Other kinds of models", or just the title for the unnumbered wrap-up. */
export function partLabel(part: Part, separator = ': '): string {
	return part.number ? `Part ${part.number}${separator}${part.title}` : part.title;
}
