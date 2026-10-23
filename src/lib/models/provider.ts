import type { DataSource } from '#lib/components/layout/data-source.ts';
import canonicalJson from '../../../models/canonical.json';

/** The canonical small model, defined once in `models/canonical.json`. */
export interface CanonicalModel {
	id: string;
	displayName: string;
	huggingFaceId: string;
	onnxId: string;
	/** ONNX file in `onnxId` to run (without the `_quantized` suffix), and its 8-bit size. */
	onnxFile: string;
	onnxMB: number;
	tokenizer: string;
	parameters: number;
	layers: number;
	heads: number;
	embeddingSize: number;
	/** Neurons in each block's MLP. */
	mlpSize: number;
	vocabularySize: number;
	contextLength: number;
}

export const canonical: CanonicalModel = canonicalJson;

export interface Token {
	id: number;
	text: string;
}

export interface Candidate {
	token: Token;
	prob: number;
}

/** The model's top candidates for the token after `context`. */
export interface NextTokenDistribution {
	context: Token[];
	candidates: Candidate[];
	/** Probability mass not covered by `candidates` (everything outside the top k). */
	rest: number;
}

export interface GenerationStep extends NextTokenDistribution {
	chosen: Token;
}

export interface Attention {
	tokens: Token[];
	/** weights[layer][head][query][key], rows sum to 1 over keys <= query. */
	weights: number[][][][];
}

export interface GenerateOptions {
	maxTokens: number;
	temperature?: number;
	topK?: number;
	/** Uniform random numbers for sampling, so runs can be repeated. */
	random?: () => number;
}

/** One interface for every data source: recorded traces, in-browser models, and remote APIs. */
export interface ModelProvider {
	readonly source: DataSource;
	tokenize(text: string): Promise<Token[]>;
	nextTokenDistribution(text: string, options?: { topK?: number }): Promise<NextTokenDistribution>;
	generate(text: string, options: GenerateOptions): Promise<GenerationStep[]>;
	attention?(text: string): Promise<Attention>;
	embed?(texts: string[]): Promise<number[][]>;
}

/** Thrown by providers that can only answer for prompts they have data for. */
export class NotAvailableError extends Error {
	constructor(what: string) {
		super(`${what} is not available from this data source`);
		this.name = 'NotAvailableError';
	}
}
