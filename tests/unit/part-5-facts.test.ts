// Checks that the numbers and examples in the Part V prose match the recorded data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';
import { SCALE, TINY_TRAINING_EXAMPLES, kaplanLoss } from '../../src/lib/data/scale.ts';
import { encode } from 'gpt-tokenizer/encoding/gpt2';
import { parseTrace, textAfter } from '../../src/lib/models/trace.ts';

const trace = (name: string) =>
	parseTrace(JSON.parse(readFileSync(`static/traces/${canonical.id}/${name}.json`, 'utf8')));
const full = (name: string) => {
	const t = trace(name);
	return textAfter(t, t.steps.length - 1) + t.steps.at(-1)!.chosen.text;
};
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const top = (name: string) => trace(name).steps[0].candidates;

describe('Ch 11: generating text', () => {
	it('greedy: "The cat sat on the floor, and the cat was still asleep."', () => {
		expect(full('the-cat-sat')).toContain(
			'The cat sat on the floor, and the cat was still asleep.'
		);
	});

	it('picking " bed" loops', () => {
		expect(full('the-cat-sat-bed')).toMatch(
			/^The cat sat on the bed, and the cat sat on the bed, and/
		);
	});

	it('the branches start from the first step’s top candidates', () => {
		const first = top('the-cat-sat').map((c) => c.token.text);
		for (const word of ['bed', 'couch', 'ground', 'edge']) expect(first).toContain(` ${word}`);
	});

	it('<|endoftext|> is token 50256', () => {
		expect(encode('<|endoftext|>', { allowedSpecial: new Set(['<|endoftext|>']) })).toEqual([
			50256
		]);
	});
});

describe('Ch 12: scale', () => {
	const by = (name: string) => SCALE.find((e) => e.name === name)!;

	it('GPT-3 is more than 1,000 times GPT-2 small', () => {
		expect(by('GPT-3').parameters / canonical.parameters).toBeGreaterThan(1000);
	});

	it('Chinchilla ≈ 20 and Llama 3 ≈ 39 training tokens per weight', () => {
		const ratio = (e: string) => by(e).trainingTokens! / by(e).parameters;
		expect(Math.round(ratio('Chinchilla'))).toBe(20);
		expect(Math.round(ratio('Llama 3 (largest)'))).toBe(39);
	});

	it('Chinchilla and Gopher used the same compute', () => {
		expect(by('Chinchilla').flops).toBe(by('Gopher').flops);
	});

	it('the tiny model has 3,790 weights and reads 192,000 characters', () => {
		expect(by('Ch 7 tiny model').parameters).toBe(3790);
		expect(TINY_TRAINING_EXAMPLES).toBe(192_000);
	});

	it('the scaling formula drops by the same fraction for each tenfold increase', () => {
		const r1 = kaplanLoss(1e7) / kaplanLoss(1e6);
		const r2 = kaplanLoss(1e9) / kaplanLoss(1e8);
		expect(r1).toBeCloseTo(r2, 10);
		expect(r1).toBeCloseTo(10 ** -0.076, 10);
	});
});

describe('Ch 13: base vs. instruct', () => {
	const data = JSON.parse(readFileSync('static/chat/base-vs-instruct.json', 'utf8'));
	const p = (prompt: string) => data.prompts.find((x: { prompt: string }) => x.prompt === prompt);

	it('base Qwen turns "boil an egg" into a quiz', () => {
		expect(p('How do I boil an egg?').base.text).toMatch(/Options are/);
	});

	it('the instruct model without its template keeps going', () => {
		expect(p('What is the capital of France?').instructNoTemplate.text).toMatch(/Python/);
		expect(p('The cat sat on the').instructNoTemplate.text).toMatch(/You are an AI assistant/);
	});

	it('the instruct model in its chat format answers and stops', () => {
		const out = p('What is the capital of France?').instruct;
		expect(out).toEqual({ text: 'The capital of France is Paris.', stopped: true });
	});
});

describe('Ch 14: quirks and limits', () => {
	it('"a man named John, who was born in 1829."', () => {
		expect(full('quirk-moon')).toContain('a man named John, who was born in 1829.');
	});

	it('latest iPhone: top guesses 6, 5, 7', () => {
		expect(
			top('quirk-iphone')
				.slice(0, 3)
				.map((c) => c.token.text)
		).toEqual([' 6', ' 5', ' 7']);
	});

	it('after "2 + 2 =", " 3" is more likely than " 4"', () => {
		const c = top('quirk-math');
		const prob = (t: string) => c.find((x) => x.token.text === t)!.prob;
		expect(prob(' 3')).toBeGreaterThan(prob(' 4'));
	});

	it('the plain France prompt rambles; the Q/A version says Paris', () => {
		expect(full('quirk-france')).toContain('the capital of the French Republic');
		expect(full('quirk-france-qa')).toContain('A: The capital of France is Paris.');
	});

	it('" strawberry" is one token, "strawberry" three', () => {
		expect(encode(' strawberry')).toHaveLength(1);
		expect(encode('strawberry')).toHaveLength(3);
	});
});

describe('Ch 15: reasoning models', () => {
	const d = json('static/reasoning/thinking.json');
	type Run = {
		correct: boolean;
		final: string | null;
		thinkingTokens: number;
		answerTokens: number;
	};
	const runs = (key: 'off' | 'on'): Run[] => d.puzzles.map((p: Record<string, Run>) => p[key]);
	const tokens = (rs: Run[]) => rs.reduce((a, r) => a + r.thinkingTokens + r.answerTokens, 0);

	it('gets 4 of 6 right both ways', () => {
		expect(runs('off').filter((r) => r.correct)).toHaveLength(4);
		expect(runs('on').filter((r) => r.correct)).toHaveLength(4);
	});

	it('counts the r’s in strawberry right only when thinking', () => {
		const p = d.puzzles.find((q: { question: string }) => q.question.includes('strawberry'));
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
