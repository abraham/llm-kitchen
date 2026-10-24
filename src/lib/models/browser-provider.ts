import type { DataSource } from '#lib/components/frame/data-source.ts';
import { applyTemperature, sampleIndex } from '#lib/math/sampling.ts';
import type { BrowserModel } from './browser-model.svelte.ts';
import {
	NotAvailableError,
	canonical,
	type GenerateOptions,
	type GenerationStep,
	type ModelProvider,
	type NextTokenDistribution,
	type ProviderInput,
	type Token
} from './provider.ts';
import { tokenize, tokensFor, type TokenizerName } from './tokenizers.ts';

const DEFAULT_TOP_K = 50;

/** A model running in the visitor's browser (tier T2), after they agree to the download. */
export class BrowserProvider implements ModelProvider {
	readonly source: DataSource;

	constructor(
		readonly model: BrowserModel,
		/** The tokenizer for next-token models; embedding models have none. */
		private readonly tokenizer: TokenizerName | null = null
	) {
		this.source = { kind: 'live', model: model.spec.label };
	}

	async tokenize(text: string): Promise<Token[]> {
		if (!this.tokenizer) throw new NotAvailableError('Tokenizing');
		return tokenize(this.tokenizer, text);
	}

	async nextTokenDistribution(
		input: ProviderInput,
		{ topK = DEFAULT_TOP_K }: { topK?: number } = {}
	): Promise<NextTokenDistribution> {
		if (!this.tokenizer) throw new NotAvailableError('Next-token prediction');
		const context = typeof input === 'string' ? await this.tokenize(input) : [...input];
		// The model can only read its context window; anything earlier is cut off.
		const ids = context.map((t) => t.id).slice(-canonical.contextLength);
		const { top, rest } = await this.model.nextToken(ids, topK);
		const tokens = await tokensFor(
			this.tokenizer,
			top.map((t) => t.id)
		);
		return { context, candidates: top.map((t, i) => ({ token: tokens[i], prob: t.prob })), rest };
	}

	async generate(input: ProviderInput, options: GenerateOptions): Promise<GenerationStep[]> {
		let context = typeof input === 'string' ? await this.tokenize(input) : [...input];
		const steps: GenerationStep[] = [];
		for (let n = 0; n < options.maxTokens; n++) {
			const dist = await this.nextTokenDistribution(context, { topK: options.topK });
			const probs = dist.candidates.map((c) => c.prob);
			const i =
				options.random && options.temperature !== 0
					? sampleIndex(applyTemperature(probs, options.temperature ?? 1), options.random())
					: 0;
			const chosen = dist.candidates[i].token;
			steps.push({ ...dist, chosen });
			context = [...context, chosen];
		}
		return steps;
	}

	async embed(texts: string[]): Promise<number[][]> {
		return this.model.embed(texts);
	}
}
