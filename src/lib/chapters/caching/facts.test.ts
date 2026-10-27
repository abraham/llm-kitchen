import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ContextSession } from '#lib/harness/agent.ts';
import {
	cacheCalls,
	cacheTotals,
	kvNumbersPerToken,
	positionsProcessed,
	type KVCacheRun
} from '#lib/harness/cache.ts';
import canonical from '../../../../models/canonical.json';

describe('caching', () => {
	const kv: KVCacheRun = readDataset('caching/kv-cache');
	const session: ContextSession = readDataset('agent/context');

	it('GPT-2 small finishes "The cat sat on the" with " floor", 500 tokens', () => {
		expect(kv.prompt).toBe('The cat sat on the');
		expect(kv.generated[0].text).toBe(' floor');
		expect(kv.generated).toHaveLength(500);
	});

	it('per token: 23 to 139 ms without the cache, about 20 with it; 43.0 s against 10.0 s', () => {
		expect(Math.round(kv.msPerToken.noCache[0])).toBe(23);
		expect(Math.round(kv.msPerToken.noCache.at(-1)!)).toBe(139);
		const late = [...kv.msPerToken.cache.slice(-50)].sort((a, b) => a - b)[25];
		expect(Math.round(late)).toBe(20);
		expect((kv.totalMs.noCache / 1000).toFixed(1)).toBe('43.0');
		expect((kv.totalMs.cache / 1000).toFixed(1)).toBe('10.0');
	});

	it('the two runs scored tokens within 0.01 of each other', () => {
		expect(kv.maxScoreDifference).toBeLessThanOrEqual(0.01);
	});

	it('the cache holds 2 × 12 × 768 = 18,432 numbers per token', () => {
		expect(kvNumbersPerToken(canonical.layers, canonical.embeddingSize)).toBe(18432);
	});

	it('counts the positions each way: every step reruns everything, or only the newest', () => {
		const brute = (p: number, steps: number) =>
			Array.from({ length: steps }, (_, s) => p + s).reduce((a, b) => a + b, 0);
		expect(positionsProcessed(5, 5, false)).toBe(brute(5, 5));
		expect(positionsProcessed(5, 5, false)).toBe(35);
		expect(positionsProcessed(5, 5, true)).toBe(9);
	});

	it('appending reuses 2,342 of 2,975 tokens (79%); the time at the top reuses none', () => {
		const append = cacheTotals(cacheCalls(session, 'append'));
		expect([append.sent, append.cached]).toEqual([2975, 2342]);
		expect(Math.round((append.cached / append.sent) * 100)).toBe(79);
		expect(cacheTotals(cacheCalls(session, 'time')).cached).toBe(0);
	});

	it('editing the system prompt throws the cache away once', () => {
		const calls = cacheCalls(session, 'system');
		expect(calls.slice(1).filter((c) => c.cached === 0)).toHaveLength(1);
	});

	it('dropping sends 2,189 tokens but costs more than appending; summarizing costs least', () => {
		const totals = (['append', 'drop', 'summarize'] as const).map((e) =>
			cacheTotals(cacheCalls(session, e))
		);
		const [append, drop, summarize] = totals;
		expect(drop.sent).toBe(2189);
		expect(drop.cost).toBeGreaterThan(append.cost);
		expect(summarize.sent).toBeLessThan(drop.sent);
		expect(summarize.cost).toBeLessThan(append.cost);
	});

	it('in depth: 127,250 token passes against 504, yet only 4.3 times the time', () => {
		const p = kv.promptTokens.length;
		const n = kv.generated.length;
		expect(p).toBe(5);
		expect(positionsProcessed(p, n, false)).toBe(127250);
		expect(positionsProcessed(p, n, true)).toBe(504);
		expect(Math.round(127250 / 504)).toBe(252);
		expect((kv.totalMs.noCache / kv.totalMs.cache).toFixed(1)).toBe('4.3');
		const early = [...kv.msPerToken.cache.slice(1, 51)].sort((a, b) => a - b)[25];
		expect(Math.round(early)).toBe(19);
	});

	it('in depth: grouped-query attention stores 14,336 numbers per token for Qwen2.5-1.5B', () => {
		const layers = 28;
		const headSize = 1536 / 12;
		expect(headSize).toBe(128);
		expect(2 * layers * 12 * headSize).toBe(86016);
		const perToken = 2 * layers * 2 * headSize;
		expect(perToken).toBe(14336);
		expect(86016 / perToken).toBe(6);
		expect(Math.round((perToken * 2) / 1000)).toBe(29);
		expect(((perToken * 2 * 32768) / 1e9).toFixed(2)).toBe('0.94');
	});

	it('in depth: appending costs 633 + 234 = 867 full-price tokens, 29%', () => {
		const append = cacheTotals(cacheCalls(session, 'append'));
		expect(append.processed).toBe(633);
		expect(Math.round(append.cached * 0.1)).toBe(234);
		expect(Math.round(append.cost)).toBe(867);
		expect(Math.round((append.cost / append.sent) * 100)).toBe(29);
		expect(cacheTotals(cacheCalls(session, 'time')).cost).toBe(2975);
	});
});
