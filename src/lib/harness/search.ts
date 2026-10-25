import { cosine } from '#lib/math/vectors.ts';

/** Questions about the long chat, embedded like its exchanges (scripts/record/search.py). */
export interface SearchQuestions {
	embedder: { id: string; revision: string };
	questions: { question: string; about: number; vector: number[] }[];
}

/** Words too common to tell texts apart, dropped before keyword matching, as search engines do. */
const STOP = new Set(
	`a an and are as at be but by did do does for from has have he her his how i in is it its me my
	of on one or she so that the their them they this to was what when where which who whom why will
	with you your user assistant`.split(/\s+/)
);

export function keywords(text: string): string[] {
	return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => !STOP.has(w));
}

/**
 * BM25 score of each text for the query: for each query word a text contains, more for rarer
 * words and more uses, with diminishing returns and a discount for long texts. 0 means no word
 * matched.
 */
export function bm25(query: string, texts: readonly string[], k1 = 1.2, b = 0.75): number[] {
	const docs = texts.map(keywords);
	const n = docs.length;
	const avg = docs.reduce((s, d) => s + d.length, 0) / n;
	const words = [...new Set(keywords(query))];
	return docs.map((doc) =>
		words.reduce((score, w) => {
			const tf = doc.filter((x) => x === w).length;
			if (tf === 0) return score;
			const df = docs.filter((d) => d.includes(w)).length;
			const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
			return score + (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avg));
		}, 0)
	);
}

export function similarities(query: readonly number[], vectors: readonly number[][]): number[] {
	return vectors.map((v) => cosine(query, v));
}

/** Indices ordered by score, highest first; texts scoring 0 or less are left out. */
export function ranking(scores: readonly number[], keepZero = false): number[] {
	return scores
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => keepZero || s > 0)
		.sort((x, y) => y.s - x.s || x.i - y.i)
		.map(({ i }) => i);
}

/** Reciprocal rank fusion: each list adds 1 / (k + rank) for every text it ranks. */
export function fuse(rankings: readonly number[][], n: number, k = 60): number[] {
	const scores = Array.from({ length: n }, () => 0);
	for (const r of rankings) r.forEach((i, rank) => (scores[i] += 1 / (k + rank + 1)));
	return scores;
}

export interface Search {
	keyword: { order: number[]; scores: number[] };
	meaning: { order: number[]; scores: number[] };
	both: { order: number[]; scores: number[] };
}

export function search(
	question: { question: string; vector: readonly number[] },
	texts: readonly string[],
	vectors: readonly number[][]
): Search {
	const kw = bm25(question.question, texts);
	const sim = similarities(question.vector, vectors);
	const keyword = { order: ranking(kw), scores: kw };
	const meaning = { order: ranking(sim, true), scores: sim };
	const fused = fuse([keyword.order, meaning.order], texts.length);
	return { keyword, meaning, both: { order: ranking(fused), scores: fused } };
}
