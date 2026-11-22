import type { ContextSession } from './agent.ts';

/** GPT-2 small generating with and without its KV cache (scripts/build-caching.py). */
export interface KVCacheRun {
	model: { id: string; displayName: string; revision: string | null };
	prompt: string;
	promptTokens: { id: number; text: string }[];
	generated: { id: number; text: string }[];
	/** Largest difference between the two runs' next-token scores. */
	maxScoreDifference: number;
	device: string;
	msPerToken: { cache: number[]; noCache: number[] };
	totalMs: { cache: number; noCache: number };
}

/**
 * Token positions run through the whole model to pick `steps` new tokens after a prompt of
 * `promptLength`. Without the cache every step reruns everything; with it, the prompt is run once
 * and then only each newest token.
 */
export function positionsProcessed(promptLength: number, steps: number, cache: boolean): number {
	if (steps <= 0) return 0;
	if (cache) return promptLength + steps - 1;
	return steps * promptLength + (steps * (steps - 1)) / 2;
}

/** Numbers the KV cache stores per token: a key and a value vector in every layer. */
export function kvNumbersPerToken(layers: number, embeddingSize: number): number {
	return 2 * layers * embeddingSize;
}

/** One stretch of a prompt. Blocks with the same key have exactly the same text. */
export interface CacheBlock {
	key: string;
	kind: 'system' | 'turn' | 'summary' | 'question';
	label: string;
	tokens: number;
}

export interface CacheCall {
	label: string;
	blocks: CacheBlock[];
	tokens: number;
	/** Tokens at the start of this prompt that an earlier call already sent: read from the cache. */
	cached: number;
}

export const CACHE_EDITS = {
	append: 'Only append',
	time: 'Put the time at the top',
	system: 'Edit the system prompt before turn 4',
	drop: 'Drop the oldest turn when over budget',
	summarize: 'Summarize old turns when over budget'
} as const;
export type CacheEdit = keyof typeof CACHE_EDITS;

/** Small on purpose, so the `managing-the-context` session goes over it. */
export const CACHE_BUDGET = 400;
/** Price of a token read from the cache, relative to a normal input token (illustrative). */
export const CACHED_PRICE = 0.1;

/** Tokens in the blocks two prompts share from the very start. */
export function sharedPrefix(a: CacheBlock[], b: CacheBlock[]): number {
	let tokens = 0;
	for (let i = 0; i < Math.min(a.length, b.length) && a[i].key === b[i].key; i++) {
		tokens += a[i].tokens;
	}
	return tokens;
}

/**
 * The prompts a harness sends for the `managing-the-context` session (six chat turns, then a question), after the
 * given edit. Each call is cached up to the longest start it shares with an earlier call.
 */
export function cacheCalls(session: ContextSession, edit: CacheEdit): CacheCall[] {
	const system = (version: string): CacheBlock => ({
		key: `system:${version}`,
		kind: 'system',
		label: 'System prompt',
		tokens: session.baseTokens
	});
	const turn = (i: number): CacheBlock => ({
		key: `turn:${i}`,
		kind: 'turn',
		label: `Turn ${i + 1}`,
		tokens: session.turns[i].tokens
	});
	const size = (blocks: CacheBlock[]) => blocks.reduce((a, b) => a + b.tokens, 0);

	const calls: CacheCall[] = [];
	let history: CacheBlock[] = [];
	const steps = session.turns.length + 1;
	for (let i = 0; i < steps; i++) {
		const head =
			edit === 'time'
				? system(`time-${i}`)
				: edit === 'system' && i >= 3
					? system('edited')
					: system('original');
		const last: CacheBlock =
			i < session.turns.length
				? turn(i)
				: {
						key: 'question',
						kind: 'question',
						label: 'Your question',
						tokens: session.questionTokens
					};
		history = [...history, last];
		const over = () => size([head, ...history]) > CACHE_BUDGET;
		if (edit === 'drop') {
			while (over() && history.length > 1) history = history.slice(1);
		} else if (edit === 'summarize' && over()) {
			history = [
				{
					key: `summary:${i}`,
					kind: 'summary',
					label: 'Summary',
					tokens: session.strategies.summarize.noteTokens ?? 0
				},
				last
			];
		}
		const blocks = [head, ...history];
		const cached = Math.max(0, ...calls.map((c) => sharedPrefix(c.blocks, blocks)));
		calls.push({ label: last.label, blocks, tokens: size(blocks), cached });
	}
	return calls;
}

/**
 * Totals across all calls: tokens sent, read from the cache, and processed from scratch, and the
 * input cost counted in full-price tokens.
 */
export function cacheTotals(calls: CacheCall[]) {
	const sent = calls.reduce((a, c) => a + c.tokens, 0);
	const cached = calls.reduce((a, c) => a + c.cached, 0);
	return { sent, cached, processed: sent - cached, cost: sent - cached + cached * CACHED_PRICE };
}

export type CacheBlockStatus = 'cached' | 'break' | 'invalidated' | 'new';

/** One prompt block enriched with why it was cached, broke the cache, or had to be recomputed. */
export interface AnnotatedCacheBlock {
	block: CacheBlock;
	callIndex: number;
	callLabel: string;
	blockIndex: number;
	startToken: number;
	status: CacheBlockStatus;
	/** Label of the block that previously occupied this slot when `status === 'break'`. */
	replacedLabel?: string;
	/** Tokens from this block through the end of the call that had to be computed from scratch. */
	recomputedTokens: number;
	/** Label of the earlier call whose prefix was compared against. */
	comparedTo?: string;
}

/** Annotate every block in every call with its cache status and where any prefix break happened. */
export function annotateCacheCalls(calls: readonly CacheCall[]): AnnotatedCacheBlock[][] {
	return calls.map((call, callIndex) => {
		let best: CacheCall | undefined;
		let bestPrefix = -1;
		for (let p = 0; p < callIndex; p++) {
			const shared = sharedPrefix(calls[p].blocks, call.blocks);
			if (shared >= bestPrefix) {
				bestPrefix = shared;
				best = calls[p];
			}
		}

		let sharedBlocks = 0;
		if (best) {
			while (
				sharedBlocks < best.blocks.length &&
				sharedBlocks < call.blocks.length &&
				best.blocks[sharedBlocks].key === call.blocks[sharedBlocks].key
			) {
				sharedBlocks++;
			}
		}
		const broke = best !== undefined && sharedBlocks < best.blocks.length;
		const bestKeys = best ? new Set(best.blocks.map((b) => b.key)) : new Set<string>();

		let offset = 0;
		return call.blocks.map((block, blockIndex) => {
			const startToken = offset;
			offset += block.tokens;
			let status: CacheBlockStatus;
			let replacedLabel: string | undefined;
			if (!best) {
				status = 'new';
			} else if (blockIndex < sharedBlocks) {
				status = 'cached';
			} else if (broke && blockIndex === sharedBlocks) {
				status = 'break';
				const prev = best.blocks[blockIndex];
				replacedLabel = prev.label === block.label ? `earlier ${prev.label}` : prev.label;
			} else if (broke && bestKeys.has(block.key)) {
				status = 'invalidated';
			} else {
				status = 'new';
			}
			return {
				block,
				callIndex,
				callLabel: call.label,
				blockIndex,
				startToken,
				status,
				replacedLabel,
				recomputedTokens: status === 'cached' ? 0 : call.tokens - startToken,
				comparedTo: best?.label
			};
		});
	});
}

/** Plain-English explanation of a selected prompt block for the live status readout. */
export function describeCacheBlock(item: AnnotatedCacheBlock): string {
	const { block, callLabel, status, replacedLabel, recomputedTokens, comparedTo } = item;
	const toks = `${block.tokens} ${block.tokens === 1 ? 'token' : 'tokens'}`;
	if (status === 'cached') {
		return `${callLabel} · ${block.label} (${toks}): read from the cache because the prompt matched ${comparedTo} from the start.`;
	}
	if (status === 'break') {
		return `${callLabel} · ${block.label} (${toks}): broke the cache by replacing ${replacedLabel} from ${comparedTo}, forcing ${recomputedTokens} tokens from here on to be processed from scratch.`;
	}
	if (status === 'invalidated') {
		return `${callLabel} · ${block.label} (${toks}): unchanged from ${comparedTo}, but processed from scratch because an earlier block broke the prefix.`;
	}
	if (!comparedTo) {
		return `${callLabel} · ${block.label} (${toks}): processed from scratch on the first call, before any cache exists.`;
	}
	return `${callLabel} · ${block.label} (${toks}): newly added at the end of the prompt and processed from scratch.`;
}
