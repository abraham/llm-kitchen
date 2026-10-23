import { type Infer, array, integer, number, object, string } from '../check.ts';

const neighbor = object({ word: string, similarity: number });

export const embeddingMap = object({
	model: string,
	dimensions: integer,
	explainedVariance: array(number),
	words: array(
		object({ word: string, group: string, x: number, y: number, neighbors: array(neighbor) })
	),
	analogy: object({ expression: string, nearest: array(neighbor) }),
	pca: object({ mean: array(number), components: array(array(number)) })
});
export type EmbeddingMapData = Infer<typeof embeddingMap>;

export const embeddingVectors = object({
	model: string,
	words: array(string),
	vectors: array(array(number))
});
export type EmbeddingVectors = Infer<typeof embeddingVectors>;
