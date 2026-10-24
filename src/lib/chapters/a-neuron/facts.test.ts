import { describe, expect, it } from 'vitest';
import { activate, layer, neuron } from '#lib/math/mlp.ts';
import { parameterBreakdown } from '#lib/math/transformer.ts';
import canonical from '../../../../models/canonical.json';

const matVec = (m: number[][], v: number[]) =>
	m.map((row) => row.reduce((a, w, j) => a + w * v[j], 0));
const matMul = (a: number[][], b: number[][]) =>
	a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));
const plus = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);

/** The error function, to within 1.5e-7 (Abramowitz and Stegun 7.1.26). */
function erf(x: number): number {
	const t = 1 / (1 + 0.3275911 * Math.abs(x));
	const poly =
		t *
		(0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
	return Math.sign(x) * (1 - poly * Math.exp(-x * x));
}

describe('a neuron, In depth', () => {
	it('y = f(sum of w_i x_i + b), with ReLU(z) = max(0, z)', () => {
		const x = [0.5, -1.2, 2];
		const w = [0.8, 0.3, -0.4];
		const b = 0.1;
		const z = w.reduce((a, wi, i) => a + wi * x[i], b);
		expect(neuron(x, w, b, 'relu').output).toBeCloseTo(Math.max(0, z), 12);
		expect(activate('relu', -2)).toBe(0);
		expect(activate('relu', 1.5)).toBe(1.5);
	});

	it('a layer is f(Wx + b), one row of W per neuron', () => {
		const W = [
			[0.2, -0.5],
			[1.1, 0.4],
			[-0.3, 0.9]
		];
		const b = [0.1, -0.2, 0.05];
		const x = [0.7, -1.4];
		const expected = plus(matVec(W, x), b).map((z) => Math.max(0, z));
		expect(layer(x, W, b, 'relu').map((n) => n.output)).toEqual(
			expected.map((y) => expect.closeTo(y, 12))
		);
	});

	it('without the squash, two layers collapse into one', () => {
		const W1 = [
			[0.2, -0.5],
			[1.1, 0.4]
		];
		const b1 = [0.3, -0.1];
		const W2 = [
			[0.7, -1.2],
			[0.5, 0.9]
		];
		const b2 = [-0.4, 0.2];
		const x = [1.3, -0.6];
		const twoLayers = plus(matVec(W2, plus(matVec(W1, x), b1)), b2);
		const oneLayer = plus(matVec(matMul(W2, W1), x), plus(matVec(W2, b1), b2));
		twoLayers.forEach((y, i) => expect(y).toBeCloseTo(oneLayer[i], 12));
	});

	it('"4,722,432 weights and biases per block, 56,669,184 across the 12 blocks: about 46%"', () => {
		const { mlp } = parameterBreakdown(canonical);
		expect(mlp).toBe(4_722_432);
		expect(mlp).toBe(
			2 * canonical.embeddingSize * canonical.mlpSize + canonical.mlpSize + canonical.embeddingSize
		);
		expect(canonical.layers * mlp).toBe(56_669_184);
		expect(Math.round(((canonical.layers * mlp) / canonical.parameters) * 100)).toBe(46);
	});

	it('the tanh approximation "matches the exact curve to within about 0.001 everywhere"', () => {
		const exact = (z: number) => 0.5 * z * (1 + erf(z / Math.SQRT2));
		const approx = (z: number) =>
			0.5 * z * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3)));
		let worst = 0;
		for (let z = -8; z <= 8; z += 0.001) worst = Math.max(worst, Math.abs(exact(z) - approx(z)));
		expect(worst).toBeLessThan(0.001);
	});
});
