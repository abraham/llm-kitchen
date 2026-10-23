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
	system: 'Edit the system prompt before task 4',
	drop: 'Drop the oldest task when over budget',
	summarize: 'Summarize old tasks when over budget'
} as const;
export type CacheEdit = keyof typeof CACHE_EDITS;

/** Small on purpose, so the Ch 18 session goes over it. */
export const CACHE_BUDGET = 1000;
/** Price of a token read from the cache, relative to a normal input token (illustrative). */
export const CACHED_PRICE = 0.1;
/** Size of the summary note in the Ch 18 recording. */
const SUMMARY_TOKENS = 29;

/** Tokens in the blocks two prompts share from the very start. */
export function sharedPrefix(a: CacheBlock[], b: CacheBlock[]): number {
	let tokens = 0;
	for (let i = 0; i < Math.min(a.length, b.length) && a[i].key === b[i].key; i++) {
		tokens += a[i].tokens;
	}
	return tokens;
}

/**
 * The prompts a harness sends for the Ch 18 session (six agent tasks, then a question), after the
 * given edit. Each call is cached up to the longest start it shares with an earlier call.
 */
export function cacheCalls(session: ContextSession, edit: CacheEdit): CacheCall[] {
	const system = (version: string): CacheBlock => ({
		key: `system:${version}`,
		kind: 'system',
		label: 'System prompt and tools',
		tokens: session.baseTokens
	});
	const turn = (i: number): CacheBlock => ({
		key: `turn:${i}`,
		kind: 'turn',
		label: `Task ${i + 1}`,
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
				{ key: `summary:${i}`, kind: 'summary', label: 'Summary', tokens: SUMMARY_TOKENS },
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
