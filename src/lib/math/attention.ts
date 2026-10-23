import { softmax } from './sampling.ts';

/**
 * Single-head causal self-attention on small, readable vectors (Ch 9). Same math as a
 * transformer head: scores = q·k / sqrt(d), mask the future, softmax each row, mix the values.
 */
export interface AttentionInput {
	tokens: string[];
	queries: number[][];
	keys: number[][];
	values: number[][];
}

export interface AttentionResult {
	/** scores[q][k] = q·k / sqrt(d), or null where k comes after q (masked). */
	scores: (number | null)[][];
	/** weights[q][k]: each row sums to 1 over k <= q. */
	weights: number[][];
	/** outputs[q] = sum over k of weights[q][k] * values[k]. */
	outputs: number[][];
}

export function attend({ tokens, queries, keys, values }: AttentionInput): AttentionResult {
	const d = queries[0].length;
	const scores = tokens.map((_, q) =>
		tokens.map((_, k) =>
			k > q ? null : queries[q].reduce((a, x, i) => a + x * keys[k][i], 0) / Math.sqrt(d)
		)
	);
	const weights = scores.map((row) => {
		const visible = row.filter((s): s is number => s !== null);
		const p = softmax(visible);
		return row.map((_, k) => (k < p.length ? p[k] : 0));
	});
	const outputs = weights.map((row) =>
		values[0].map((_, j) => row.reduce((a, w, k) => a + w * values[k][j], 0))
	);
	return { scores, weights, outputs };
}

/** Made-up vectors for the Ch 9 walkthrough. Not from a real model; chosen to be readable. */
export const TOY_ATTENTION: AttentionInput = {
	tokens: ['The', 'trophy', 'suitcase', 'it'],
	queries: [
		[0.2, 0.1],
		[0.4, 0.9],
		[0.3, 0.8],
		[1.6, 0.4]
	],
	keys: [
		[0.1, 0.3],
		[1.5, 0.2],
		[0.8, 0.9],
		[0.2, 0.1]
	],
	values: [
		[0.1, 0.0, 0.2],
		[0.9, 0.2, 0.1],
		[0.1, 0.8, 0.3],
		[0.2, 0.2, 0.9]
	]
};
