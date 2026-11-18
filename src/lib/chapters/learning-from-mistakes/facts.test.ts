import { describe, expect, it } from 'vitest';
import { Adam, CharModel } from '#lib/math/mlp.ts';
import { RHYMES } from '#lib/data/rhymes.ts';
import { readDataset } from '#lib/datasets/read.ts';
import { tokenize } from '#lib/models/tokenizers.ts';

describe('learning from mistakes, In depth', () => {
	it('guessing evenly among V choices gives a loss of ln V; perplexity e^L undoes it', () => {
		for (const V of [2, 30, 50_257]) {
			const loss = -Math.log(1 / V);
			expect(loss).toBeCloseTo(Math.log(V), 12);
			expect(Math.exp(loss)).toBeCloseTo(V, 6);
		}
	});

	it('a neuron\'s slope is "the slope from above, times f\'(z), times the input"', () => {
		const x = [0.6, -1.1];
		const w = [0.4, 0.9];
		const b = 0.2;
		const loss = (weights: number[]) => {
			const y = Math.tanh(weights.reduce((a, wi, i) => a + wi * x[i], b));
			return (y - 0.5) ** 2;
		};
		const z = w.reduce((a, wi, i) => a + wi * x[i], b);
		const y = Math.tanh(z);
		const h = 1e-6;
		for (let i = 0; i < w.length; i++) {
			const nudged = w.map((wi, j) => (j === i ? wi + h : wi));
			const numeric = (loss(nudged) - loss(w)) / h;
			const chain = 2 * (y - 0.5) * (1 - y * y) * x[i];
			expect(chain).toBeCloseTo(numeric, 4);
		}
	});

	it('Adam uses its "usual settings, 0.9 and 0.999"', () => {
		const param = Float64Array.from([1]);
		const adam = new Adam(1);
		const lr = 0.1;
		const grads = [0.5, -2];
		let m = 0;
		let v = 0;
		let expected = 1;
		grads.forEach((g, i) => {
			adam.step(param, Float64Array.from([g]), lr);
			m = 0.9 * m + 0.1 * g;
			v = 0.999 * v + 0.001 * g * g;
			const t = i + 1;
			expected -= (lr * (m / (1 - 0.9 ** t))) / (Math.sqrt(v / (1 - 0.999 ** t)) + 1e-8);
			expect(param[0]).toBeCloseTo(expected, 12);
		});
	});
});

describe('learning from mistakes, Standard', () => {
	it('the tiny model: 8 numbers per character, 3 characters into 64 neurons, a chance per character', () => {
		const lower = RHYMES.map((r) => r.text.toLowerCase());
		const vocab = ['\u0000', ...[...new Set(lower.join(''))].sort()];
		const V = vocab.length;
		const model = new CharModel({ vocab, context: 3, embedding: 8, hidden: 64 }, 1);
		expect(model.E.length).toBe(V * 8);
		expect(model.parameterCount).toBe(V * 8 + 3 * 8 * 64 + 64 + 64 * V + V);
		expect(model.parameterCount).toBe(3790);
		expect(model.probabilities([1, 2, 3]).length).toBe(V);
	});

	it('GPT-2 on the Alice sentence: 3.31 per token (perplexity 27), 65 tokens over 294 bytes, 310 bits, 1.06 bits per byte; 0.73 per character (2.1)', async () => {
		const q = readDataset('quantize/precisions');
		const loss = q.precisions.find((p) => p.bits === 32)!.loss;
		const predicted = (await tokenize('gpt2', q.passage)).slice(1);
		const bytes = new TextEncoder().encode(predicted.map((t) => t.text).join('')).length;
		const nats = loss * predicted.length;
		expect(q.passage).toMatch(/^Alice was beginning to get very tired/);
		expect(loss.toFixed(2)).toBe('3.31');
		expect(Math.round(Math.exp(loss))).toBe(27);
		expect([predicted.length, bytes]).toEqual([65, 294]);
		expect(Math.round(nats / Math.LN2)).toBe(310);
		expect(((predicted.length / bytes) * (loss / Math.LN2)).toFixed(2)).toBe('1.06');
		expect((nats / bytes).toFixed(2)).toBe('0.73');
		expect(Math.exp(nats / bytes).toFixed(1)).toBe('2.1');
	});
});
