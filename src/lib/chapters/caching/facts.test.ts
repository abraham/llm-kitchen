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

	it('per token: 24 to 139 ms without the cache, about 20 with it; 43.2 s against 10.0 s', () => {
		expect(Math.round(kv.msPerToken.noCache[0])).toBe(24);
		expect(Math.round(kv.msPerToken.noCache.at(-1)!)).toBe(139);
		expect(Math.round(kv.msPerToken.cache.at(-1)!)).toBe(20);
		expect((kv.totalMs.noCache / 1000).toFixed(1)).toBe('43.2');
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

	it('appending reuses 6,100 of 7,656 tokens (80%); the time at the top reuses none', () => {
		const append = cacheTotals(cacheCalls(session, 'append'));
		expect([append.sent, append.cached]).toEqual([7656, 6100]);
		expect(Math.round((append.cached / append.sent) * 100)).toBe(80);
		expect(cacheTotals(cacheCalls(session, 'time')).cached).toBe(0);
	});

	it('editing the system prompt throws the cache away once', () => {
		const calls = cacheCalls(session, 'system');
		expect(calls.slice(1).filter((c) => c.cached === 0)).toHaveLength(1);
	});

	it('dropping sends 5,776 tokens but costs more than appending; summarizing costs least', () => {
		const totals = (['append', 'drop', 'summarize'] as const).map((e) =>
			cacheTotals(cacheCalls(session, e))
		);
		const [append, drop, summarize] = totals;
		expect(drop.sent).toBe(5776);
		expect(drop.cost).toBeGreaterThan(append.cost);
		expect(summarize.sent).toBeLessThan(drop.sent);
		expect(summarize.cost).toBeLessThan(append.cost);
	});
});
