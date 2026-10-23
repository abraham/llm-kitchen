import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { ThinkingRun } from '#lib/datasets/parsers/prompts.ts';

describe('reasoning models', () => {
	const d = readDataset('reasoning/thinking');
	const runs = (key: 'off' | 'on'): ThinkingRun[] => d.puzzles.map((p) => p[key]);
	const tokens = (rs: ThinkingRun[]) =>
		rs.reduce((a, r) => a + r.thinkingTokens + r.answerTokens, 0);

	it('gets 4 of 6 right both ways', () => {
		expect(runs('off').filter((r) => r.correct)).toHaveLength(4);
		expect(runs('on').filter((r) => r.correct)).toHaveLength(4);
	});

	it('counts the r’s in strawberry right only when thinking', () => {
		const p = d.puzzles.find((q) => q.question.includes('strawberry'))!;
		expect(p.off.final).toBe('2');
		expect(p.on.final).toBe('3');
		expect(p.on.thinking).toContain('S-T-R-A-W-B-E-R-R-Y');
	});

	it('writes about 24 times as many tokens when thinking; twice it never answers', () => {
		expect(Math.round(tokens(runs('on')) / tokens(runs('off')))).toBe(24);
		const unfinished = runs('on').filter((r) => r.final === null);
		expect(unfinished).toHaveLength(2);
		for (const r of unfinished) expect(r.thinkingTokens).toBe(d.settings.on.max_new_tokens);
		expect(d.settings.on.max_new_tokens).toBe(6000);
	});
});
