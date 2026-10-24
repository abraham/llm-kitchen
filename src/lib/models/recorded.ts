import type { DataSource } from '#lib/components/frame/data-source.ts';
import { sampleIndex } from '#lib/math/sampling.ts';
import {
	NotAvailableError,
	inputText,
	type GenerateOptions,
	type GenerationStep,
	type ModelProvider,
	type NextTokenDistribution,
	type ProviderInput,
	type Token
} from './provider.ts';
import { textAfter, type Trace } from './trace.ts';

/**
 * Answers from pre-computed traces only (tier T0). It can replay a recorded run, and it can
 * answer for any prefix of a recorded run, but not for arbitrary new prompts.
 */
export class RecordedProvider implements ModelProvider {
	readonly source: DataSource;

	constructor(private readonly traces: readonly Trace[]) {
		const kinds = new Set(traces.map((t) => t.kind));
		this.source =
			kinds.size === 1 && kinds.has('sample')
				? { kind: 'sample' }
				: { kind: 'recorded', model: traces[0]?.modelDisplayName };
	}

	/** Find the trace and step whose context text equals `text`. */
	private locate(text: string): { trace: Trace; step: number } {
		for (const trace of this.traces) {
			for (let step = 0; step < trace.steps.length; step++) {
				if (textAfter(trace, step) === text) return { trace, step };
			}
		}
		throw new NotAvailableError(`A recording for "${text}"`);
	}

	/** Whether some recording has a next-token distribution for exactly this text. */
	has(text: string): boolean {
		return this.traces.some((trace) =>
			trace.steps.some((_, step) => textAfter(trace, step) === text)
		);
	}

	async tokenize(text: string): Promise<Token[]> {
		const { trace, step } = this.locate(text);
		return trace.steps[step].context;
	}

	async nextTokenDistribution(
		input: ProviderInput,
		options: { topK?: number } = {}
	): Promise<NextTokenDistribution> {
		const { trace, step } = this.locate(inputText(input));
		const { context, candidates, rest } = trace.steps[step];
		if (options.topK === undefined || options.topK >= candidates.length) {
			return { context, candidates, rest };
		}
		const kept = candidates.slice(0, options.topK);
		const dropped = candidates.slice(options.topK).reduce((a, c) => a + c.prob, 0);
		return { context, candidates: kept, rest: rest + dropped };
	}

	/**
	 * Replays the recorded choices. With `random` set, it samples among the recorded candidates
	 * instead, which only works while the sampled path stays on the recording.
	 */
	async generate(input: ProviderInput, options: GenerateOptions): Promise<GenerationStep[]> {
		const { trace, step } = this.locate(inputText(input));
		const steps = trace.steps.slice(step, step + options.maxTokens);
		if (!options.random) return steps;

		const first = steps[0];
		const i = sampleIndex(
			first.candidates.map((c) => c.prob),
			options.random()
		);
		return [{ ...first, chosen: first.candidates[i].token }];
	}

	async attention(text: string) {
		const { trace, step } = this.locate(text);
		if (!trace.attention || step !== 0) throw new NotAvailableError('Attention');
		return trace.attention;
	}
}
