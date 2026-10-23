/** Vector helpers for the embedding chapter. Vectors are plain number arrays. */

export function dot(a: readonly number[], b: readonly number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

export function norm(a: readonly number[]): number {
	return Math.sqrt(dot(a, a));
}

export function cosine(a: readonly number[], b: readonly number[]): number {
	return dot(a, b) / (norm(a) * norm(b));
}

export function add(a: readonly number[], b: readonly number[]): number[] {
	return a.map((x, i) => x + b[i]);
}

export function sub(a: readonly number[], b: readonly number[]): number[] {
	return a.map((x, i) => x - b[i]);
}

/** Project a vector onto PCA axes: (v - mean) · component, for each component. */
export function project(
	v: readonly number[],
	mean: readonly number[],
	components: readonly number[][]
) {
	const centered = sub(v, mean);
	return components.map((c) => dot(centered, c));
}

/** The `k` most similar items by cosine similarity, most similar first. */
export function nearest(
	query: readonly number[],
	items: readonly { word: string; vector: readonly number[] }[],
	k: number,
	exclude: ReadonlySet<string> = new Set()
): { word: string; similarity: number }[] {
	return items
		.filter((item) => !exclude.has(item.word))
		.map((item) => ({ word: item.word, similarity: cosine(query, item.vector) }))
		.sort((a, b) => b.similarity - a.similarity)
		.slice(0, k);
}
