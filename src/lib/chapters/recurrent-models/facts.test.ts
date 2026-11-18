import { describe, expect, it } from 'vitest';
import canonicalJson from '../../../../models/canonical.json';
import { RHYMES } from '#lib/data/rhymes.ts';
import { QWEN35_2B as q } from '#lib/chapters/recurrent-models/data.ts';
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

	it('in depth: Qwen3.5-2B keeps 4.7 million numbers of fixed memory, plus 6,144 per token: 1.6 billion at 262,144 tokens, against 6.4 billion if all attention', () => {
		const attention = q.layers / q.attentionEvery;
		const delta = q.layers - attention;
		expect([attention, delta]).toEqual([6, 18]);
		const perLayer = q.deltaHeads * q.deltaKeyDim * q.deltaValueDim;
		expect(perLayer).toBe(262_144);
		expect(((delta * perLayer) / 1e6).toFixed(1)).toBe('4.7');
		const perToken = 2 * attention * q.kvHeads * q.headDim;
		expect(perToken).toBe(6144);
		expect(((perToken * q.context) / 1e9).toFixed(1)).toBe('1.6');
		const allAttention = 2 * q.layers * q.kvHeads * q.headDim;
		expect(allAttention / perToken).toBe(4);
		expect(((allAttention * q.context) / 1e9).toFixed(1)).toBe('6.4');
	});
});
