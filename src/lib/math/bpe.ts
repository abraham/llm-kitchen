/** Byte pair encoding, as in Sennrich et al. (2016), Algorithm 1, on a word-frequency corpus. */

export const END = '</w>';

export interface BpeWord {
	symbols: string[];
	count: number;
}

export interface BpeStep {
	/** Words split into symbols after this many merges. */
	words: BpeWord[];
	/** The pair merged to reach this step (undefined for the starting split). */
	merged?: [string, string];
	/** How often that pair appeared, weighted by word counts. */
	pairCount?: number;
	vocabulary: string[];
	/** Total symbols across the corpus (weighted by word counts). */
	totalSymbols: number;
}

export function splitWords(corpus: Record<string, number>): BpeWord[] {
	return Object.entries(corpus).map(([word, count]) => ({ symbols: [...word, END], count }));
}

/** Pair counts in first-seen order (ties go to the pair seen first, like the paper's code). */
export function pairCounts(
	words: BpeWord[]
): Map<string, { pair: [string, string]; count: number }> {
	const counts = new Map<string, { pair: [string, string]; count: number }>();
	for (const { symbols, count } of words) {
		for (let i = 0; i + 1 < symbols.length; i++) {
			const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
			const entry = counts.get(key) ?? { pair: [symbols[i], symbols[i + 1]], count: 0 };
			entry.count += count;
			counts.set(key, entry);
		}
	}
	return counts;
}

function merge(words: BpeWord[], [a, b]: [string, string]): BpeWord[] {
	return words.map(({ symbols, count }) => {
		const out: string[] = [];
		for (let i = 0; i < symbols.length; i++) {
			if (symbols[i] === a && symbols[i + 1] === b) {
				out.push(a + b);
				i++;
			} else {
				out.push(symbols[i]);
			}
		}
		return { symbols: out, count };
	});
}

function summarize(words: BpeWord[], vocabulary: string[]) {
	return {
		words,
		vocabulary,
		totalSymbols: words.reduce((a, w) => a + w.symbols.length * w.count, 0)
	};
}

/** Run `merges` BPE merges and return every intermediate step (step 0 = characters). */
export function learnBpe(corpus: Record<string, number>, merges: number): BpeStep[] {
	let words = splitWords(corpus);
	const vocabulary = [...new Set(words.flatMap((w) => w.symbols))];
	const steps: BpeStep[] = [summarize(words, [...vocabulary])];

	for (let m = 0; m < merges; m++) {
		let best: { pair: [string, string]; count: number } | undefined;
		for (const entry of pairCounts(words).values()) {
			if (!best || entry.count > best.count) best = entry;
		}
		if (!best || best.count < 2) break;
		words = merge(words, best.pair);
		vocabulary.push(best.pair.join(''));
		steps.push({ ...summarize(words, [...vocabulary]), merged: best.pair, pairCount: best.count });
	}
	return steps;
}

/** The toy corpus from Sennrich et al. (2016): word -> how often it appears. */
export const SENNRICH_CORPUS: Record<string, number> = { low: 5, lower: 2, newest: 6, widest: 3 };
