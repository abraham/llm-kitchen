import { asset } from '$app/paths';
import type { Candidate } from './provider.ts';

/** Fetch static JSON once (browser only; stays pending during prerendering). */
const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
	if (typeof window === 'undefined') return new Promise(() => {});
	let pending = cache.get(path);
	if (!pending) {
		pending = fetch(asset(path as Parameters<typeof asset>[0])).then((res) => {
			if (!res.ok) throw new Error(`Could not load data (${res.status})`);
			return res.json();
		});
		pending.catch(() => cache.delete(path));
		cache.set(path, pending);
	}
	return pending as Promise<T>;
}

export interface TokenVectors {
	model: string;
	modelDisplayName: string;
	prompt: string;
	tokens: { id: number; text: string }[];
	dimensions: number;
	tokenEmbeddings: number[][];
	positionEmbeddings: number[][];
	lastTokenByLayer: number[][];
	/** For each entry of lastTokenByLayer: the top next-token guesses if the model stopped there. */
	logitLens: Candidate[][];
}

export interface EmbeddingMapData {
	model: string;
	dimensions: number;
	explainedVariance: number[];
	words: {
		word: string;
		group: string;
		x: number;
		y: number;
		neighbors: { word: string; similarity: number }[];
	}[];
	analogy: { expression: string; nearest: { word: string; similarity: number }[] };
	pca: { mean: number[]; components: number[][] };
}

export interface EmbeddingVectors {
	model: string;
	words: string[];
	vectors: number[][];
}
