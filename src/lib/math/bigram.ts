import { sampleIndex } from './sampling.ts';

/** Lowercase words, keeping apostrophes inside words ("king's", "couldn't"). */
export function words(text: string): string[] {
	return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

export type BigramCounts = Record<string, Record<string, number>>;

/** Count how often each word follows each other word. Pairs never span two texts. */
export function bigramCounts(texts: readonly string[]): BigramCounts {
	const counts: BigramCounts = {};
	for (const text of texts) {
		const w = words(text);
		for (let i = 0; i + 1 < w.length; i++) {
			const row = (counts[w[i]] ??= {});
			row[w[i + 1]] = (row[w[i + 1]] ?? 0) + 1;
		}
	}
	return counts;
}

/** Every (word, next word) pair in reading order, for animating the count table filling in. */
export function bigramPairs(texts: readonly string[]): [string, string][] {
	return texts.flatMap((text) => {
		const w = words(text);
		return w.slice(0, -1).map((word, i) => [word, w[i + 1]] as [string, string]);
	});
}

/** P(next | word) from the counts, most likely first (ties alphabetical). */
export function nextWordProbs(counts: BigramCounts, word: string): { word: string; p: number }[] {
	const row = counts[word] ?? {};
	const total = Object.values(row).reduce((a, b) => a + b, 0);
	return Object.entries(row)
		.map(([next, n]) => ({ word: next, p: n / total }))
		.sort((a, b) => b.p - a.p || a.word.localeCompare(b.word));
}

/** Generate up to `length` words by sampling from the bigram counts; stops at a dead end. */
export function generateBigram(
	counts: BigramCounts,
	start: string,
	length: number,
	random: () => number
): string[] {
	const out = [start];
	while (out.length < length) {
		const options = nextWordProbs(counts, out[out.length - 1]);
		if (options.length === 0) break;
		out.push(
			options[
				sampleIndex(
					options.map((o) => o.p),
					random()
				)
			].word
		);
	}
	return out;
}
