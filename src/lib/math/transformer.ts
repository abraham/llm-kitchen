import type { CanonicalModel } from '#lib/models/provider.ts';

/** Where a GPT-2-style model's parameters live (Ch 10). Weights plus biases. */
export function parameterBreakdown(m: CanonicalModel) {
	const d = m.embeddingSize;
	const layerNorm = 2 * d; // a scale and a shift per number
	const embeddings = m.vocabularySize * d + m.contextLength * d;
	// Query, key and value for all heads, plus the output mix.
	const attention = 3 * d * d + 3 * d + d * d + d;
	const mlp = d * m.mlpSize + m.mlpSize + m.mlpSize * d + d;
	const block = layerNorm + attention + layerNorm + mlp;
	// The output step reuses the token embedding table, so it only adds a final layer norm.
	const output = layerNorm;
	return {
		embeddings,
		attention,
		mlp,
		layerNorms: 2 * layerNorm,
		block,
		blocks: m.layers * block,
		output,
		total: embeddings + m.layers * block + output
	};
}
