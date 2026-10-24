import { describe, expect, it } from 'vitest';
import canonicalJson from '../../../../models/canonical.json';
import { RHYMES } from '#lib/data/rhymes.ts';
import { CharRNN, RNNTrainer } from '#lib/math/rnn.ts';
import { seededRandom } from '#lib/math/sampling.ts';

describe('recurrent models', () => {
	it('keeps 2 × layers × embedding size numbers per token with attention', () => {
		expect(2 * canonicalJson.layers * canonicalJson.embeddingSize).toBe(18432);
	});

	it('in depth: at 1,024 tokens GPT-2 keeps 18,874,368 numbers; the tiny model 32', () => {
		const perToken = 2 * canonicalJson.layers * canonicalJson.embeddingSize;
		expect(perToken * canonicalJson.contextLength).toBe(18874368);
		const h = new CharRNN(30, 32, 1).step(new Float64Array(32), 0).h;
		expect(h).toHaveLength(32);
		for (const x of h) expect(Math.abs(x)).toBeLessThan(1);
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
