/**
 * Qwen3.5-2B's layer mix, from its config.json (qwen35-2b-model-card): 24 layers, every fourth
 * one full attention, the rest Gated DeltaNet.
 */
export const QWEN35_2B = {
	layers: 24,
	attentionEvery: 4,
	/** Attention layers: key/value heads and the numbers in each head's key or value. */
	kvHeads: 2,
	headDim: 256,
	/** Gated DeltaNet layers: heads, each with a key-by-value grid of numbers as its memory. */
	deltaHeads: 16,
	deltaKeyDim: 128,
	deltaValueDim: 128,
	context: 262_144
} as const;
