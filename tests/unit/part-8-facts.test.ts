import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonicalJson from '../../models/canonical.json';
import { chapterByNumber } from '../../src/lib/chapters/meta.ts';
import { STAGES, VARIANTS, type StageGroup } from '../../src/lib/data/end-to-end.ts';
import { QUESTIONS } from '../../src/lib/data/quiz.ts';
import { RHYMES } from '../../src/lib/data/rhymes.ts';
import { MOE_MODELS } from '../../src/lib/data/moe.ts';
import { CharRNN, RNNTrainer } from '../../src/lib/math/rnn.ts';
import { seededRandom } from '../../src/lib/math/sampling.ts';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('Ch 30: encoders', () => {
	const d = json('static/encoders/fill-mask.json');

	it('BERT uses the words after the blank; GPT-2 cannot', () => {
		const [fridge, bread] = d.sentences;
		expect(fridge.gpt2[0].text).toBe(' floor');
		expect(fridge.bert[0].text).toBe('top');
		expect(bread.gpt2[0].text).toBe(' hospital');
		expect(bread.bert[0].text).toBe('market');
	});

	it('the mask grid sentence has the blank at token 6 of 10', () => {
		const tokens: string[] = d.sentences[0].tokens;
		expect(tokens).toHaveLength(10);
		expect(tokens.indexOf('[MASK]')).toBe(5);
	});
});

describe('Ch 31: mixture of experts', () => {
	it('Mixtral uses about a quarter of its weights per token, DeepSeek-V3 about 6%', () => {
		const share = (name: string) => {
			const m = MOE_MODELS.find((x) => x.name === name)!;
			return m.activeParameters / m.totalParameters;
		};
		expect(share('Mixtral 8x7B')).toBeCloseTo(0.28, 2);
		expect(Math.round(share('DeepSeek-V3') * 100)).toBe(6);
	});
});

describe('Ch 32: recurrent models', () => {
	it('keeps 2 × layers × embedding size numbers per token with attention', () => {
		expect(2 * canonicalJson.layers * canonicalJson.embeddingSize).toBe(18432);
	});

	it('after the widget’s 1,500 training steps, it expects “u” after “humpty d”', () => {
		const texts = RHYMES.map((r) => r.text.toLowerCase());
		const vocab = [...new Set(texts.join(''))].sort();
		const encode = (s: string) => [...s].map((c) => vocab.indexOf(c));
		const random = seededRandom(1);
		const trainer = new RNNTrainer(new CharRNN(vocab.length, 32, 1));
		for (let i = 0; i < 1500; i++) {
			trainer.step(
				Array.from({ length: 16 }, () => {
					const t = texts[Math.floor(random() * texts.length)];
					const start = Math.floor(random() * (t.length - 24));
					return encode(t.slice(start, start + 24));
				})
			);
		}
		let h: Float64Array = new Float64Array(32);
		let probs: Float64Array = new Float64Array(vocab.length);
		for (const c of encode('humpty d')) ({ h, probs } = trainer.model.step(h, c));
		expect(vocab[probs.indexOf(Math.max(...probs))]).toBe('u');
	}, 60_000);
});

describe('Ch 33: seeing pictures', () => {
	const d = json('static/vision/clip.json');
	const names: string[] = d.images.map((i: { name: string }) => i.name);
	const best = (c: { similarity: number[] }) =>
		names[c.similarity.indexOf(Math.max(...c.similarity))];

	it('cuts 224-pixel pictures into a 7 × 7 grid of 32-pixel patches of 768 numbers', () => {
		expect([d.imageSize, d.grid, d.patchSize, d.patchDimensions]).toEqual([224, 7, 32, 768]);
	});

	it('gives identical background patches identical vectors', () => {
		const patches: number[][] = d.images[0].patches;
		expect(patches[0]).toEqual(patches[48]);
	});

	it('picks the right picture first for all 12 exact descriptions', () => {
		const exact = d.captions.slice(0, 12);
		for (const c of exact) expect(best(c)).toBe(c.text.slice(2).replace(' ', '-'));
	});

	it('barely prefers a circle for “something round”; the cat matches nothing well', () => {
		const caption = (t: string) => d.captions.find((c: { text: string }) => c.text === t);
		expect(best(caption('something round'))).toMatch(/circle/);
		const exactBest = Math.min(
			...d.captions.slice(0, 12).map((c: { similarity: number[] }) => Math.max(...c.similarity))
		);
		expect(Math.max(...caption('a photo of a cat').similarity)).toBeLessThan(exactBest);
	});
});

const ORDER: StageGroup[] = ['before', 'model', 'after'];

describe('Ch 36: from message to reply', () => {
	const run = json('static/agent/chat.json');
	const trace = json('static/traces/gpt2/the-cat-sat.json');
	const vectors = json('static/vectors/gpt2/the-cat-sat.json');
	const kv = json('static/caching/kv-cache.json');
	const [call1, call2] = run.steps;

	it('links every Part I–VII from a stage, and Part VIII from the closing box', () => {
		const parts = (chapters: number[]) =>
			new Set(chapters.map((n) => chapterByNumber(n).part.number));
		const fromStages = parts(STAGES.flatMap((s) => s.chapters));
		for (const p of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']) expect(fromStages).toContain(p);
		expect([...parts(VARIANTS.map((v) => v.chapter))]).toEqual(['VIII']);
		expect(VARIANTS.map((v) => v.chapter)).toEqual([30, 31, 32, 33, 34]);
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
		expect(trace.settings.temperature).toBe(0);
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
});

describe('Ch 37: check yourself', () => {
	it('asks at least one question from every Part I–VIII', () => {
		const parts = new Set(
			QUESTIONS.flatMap((q) => q.chapters.map((n) => chapterByNumber(n).part.number))
		);
		for (const p of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']) expect(parts).toContain(p);
	});

	it('keeps the questions in reading order, each with a valid answer', () => {
		const first = QUESTIONS.map((q) => q.chapters[0]);
		expect(first).toEqual([...first].sort((a, b) => a - b));
		for (const q of QUESTIONS) {
			expect(q.options[q.answer]).toBeDefined();
			expect(new Set(q.options).size).toBe(q.options.length);
			expect(q.why).not.toMatch(/Ch \d/);
		}
		expect(QUESTIONS).toHaveLength(12);
	});
});
