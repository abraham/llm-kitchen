import type { CanonicalModel } from '#lib/models/provider.ts';

type Shape = Pick<
	CanonicalModel,
	'embeddingSize' | 'mlpSize' | 'vocabularySize' | 'contextLength' | 'layers'
>;

/** Where a GPT-2-style model's parameters live (Ch 10). Weights plus biases. */
export function parameterBreakdown(m: Shape) {
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

/** Weights outside the token and position tables, as counted by Kaplan et al. (2020). */
export function nonEmbeddingParameters(m: Shape): number {
	const p = parameterBreakdown(m);
	return p.total - p.embeddings;
}

const gpt2 = (name: string, layers: number, embeddingSize: number) => ({
	name,
	layers,
	embeddingSize,
	mlpSize: 4 * embeddingSize,
	vocabularySize: 50257,
	contextLength: 1024
});

/** The four released GPT-2 sizes (Radford et al. 2019, Table 2). */
export const GPT2_FAMILY = [
	gpt2('GPT-2 small', 12, 768),
	gpt2('GPT-2 medium', 24, 1024),
	gpt2('GPT-2 large', 36, 1280),
	gpt2('GPT-2 XL', 48, 1600)
];
