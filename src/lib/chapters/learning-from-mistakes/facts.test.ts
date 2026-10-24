import { describe, expect, it } from 'vitest';
import { Adam } from '#lib/math/mlp.ts';

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
