import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { chapter, type Slug } from '#lib/curriculum/index.ts';
import { STAGES, VARIANTS, type StageGroup } from '#lib/chapters/end-to-end/data.ts';

const ORDER: StageGroup[] = ['before', 'model', 'after'];

describe('from message to reply', () => {
	const run = readDataset('agent/chat');
	const trace = readDataset('traces/the-cat-sat');
	const vectors = readDataset('vectors/the-cat-sat');
	const kv = readDataset('caching/kv-cache');
	const [call1, call2] = run.steps;

	it('links every Part I–IX from a stage, and Part X from the closing box', () => {
		const parts = (chapters: Slug[]) => new Set(chapters.map((s) => chapter(s).part.number));
		const fromStages = parts(STAGES.flatMap((s) => s.chapters));
		for (const p of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'])
			expect(fromStages).toContain(p);
		expect([...parts(VARIANTS.map((v) => v.chapter))]).toEqual(['X']);
		expect(VARIANTS.map((v) => v.chapter)).toEqual([
			'encoders',
			'mixture-of-experts',
			'recurrent-models',
			'seeing-pictures',
			'diffusion',
			'decision-models'
		]);
	});

	it('lists the stages in run order: harness, then the model, then the harness again', () => {
		const groups = STAGES.map((s) => s.group);
		expect(groups).toEqual([...groups].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
		expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
	});

	it('the second call starts with the whole first call: 400 of 493 tokens', () => {
		expect(call2.prompt.startsWith(call1.prompt)).toBe(true);
		expect([call1.promptTokens, call2.promptTokens]).toEqual([400, 493]);
		expect(call1.call).toEqual({ name: 'search_rhymes', arguments: { query: 'cat' } });
		expect(call2.call).toBeUndefined();
		expect(run.policy).toBe('none');
	});

	it('GPT-2 picks " floor" greedily at 7.6%, and the logit lens reads " same" then " floor"', () => {
		expect(trace.settings?.temperature).toBe(0);
		expect(trace.steps[0].chosen.text).toBe(' floor');
		expect(trace.steps[0].candidates[0].prob).toBeCloseTo(0.076, 3);
		expect(trace.tokens).toHaveLength(5);
		const guess = (b: number) => vectors.logitLens[b][0].token.text;
		expect([guess(1), guess(8), guess(12)]).toEqual([' same', ' floor', ' floor']);
	});

	it('500 tokens took about 10 seconds with the KV cache and 43 without', () => {
		expect(kv.generated).toHaveLength(500);
		expect(Math.round(kv.totalMs.cache / 1000)).toBe(10);
		expect(Math.round(kv.totalMs.noCache / 1000)).toBe(43);
	});

	it('in depth: with caching the second call reads 93 new tokens: 493 of work instead of 893', () => {
		const fresh = call2.promptTokens - call1.promptTokens;
		expect(fresh).toBe(93);
		expect(call1.promptTokens + fresh).toBe(493);
		expect(call1.promptTokens + call2.promptTokens).toBe(893);
		expect(call1.output.endsWith('</tool_call>')).toBe(true);
	});
});
