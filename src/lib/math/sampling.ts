/** Small, dependency-free probability helpers shared by widgets and tests. */

export interface Weighted<T> {
	item: T;
	p: number;
}

export function softmax(logits: readonly number[], temperature = 1): number[] {
	if (logits.length === 0) return [];
	if (temperature <= 0) {
		const best = logits.indexOf(Math.max(...logits));
		return logits.map((_, i) => (i === best ? 1 : 0));
	}
	const scaled = logits.map((l) => l / temperature);
	const max = Math.max(...scaled);
	const exps = scaled.map((s) => Math.exp(s - max));
	const sum = exps.reduce((a, b) => a + b, 0);
	return exps.map((e) => e / sum);
}

/**
 * Re-weight probabilities as if they came from logits divided by `temperature`.
 * Equivalent to p_i^(1/T) normalized. T = 0 puts all mass on the most likely item.
 */
export function applyTemperature(probs: readonly number[], temperature: number): number[] {
	return softmax(
		probs.map((p) => (p > 0 ? Math.log(p) : -Infinity)),
		temperature
	).map((p) => (Number.isNaN(p) ? 0 : p));
}

/** Keep the `k` most likely items (ties broken by original order) and renormalize. */
export function topK<T>(items: readonly Weighted<T>[], k: number): Weighted<T>[] {
	const kept = [...items]
		.map((w, i) => ({ w, i }))
		.sort((a, b) => b.w.p - a.w.p || a.i - b.i)
		.slice(0, Math.max(1, k))
		.sort((a, b) => a.i - b.i)
		.map(({ w }) => w);
	return normalize(kept);
}

export function normalize<T>(items: readonly Weighted<T>[]): Weighted<T>[] {
	const sum = items.reduce((a, w) => a + w.p, 0);
	return items.map((w) => ({ item: w.item, p: sum > 0 ? w.p / sum : 0 }));
}

/** Pick an index with probability proportional to its weight. `u` is uniform in [0, 1). */
export function sampleIndex(probs: readonly number[], u: number): number {
	const sum = probs.reduce((a, b) => a + b, 0);
	let target = u * sum;
	for (let i = 0; i < probs.length; i++) {
		target -= probs[i];
		if (target < 0) return i;
	}
	return probs.length - 1;
}

/** Deterministic PRNG (mulberry32) so demos and tests can be repeatable. */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
