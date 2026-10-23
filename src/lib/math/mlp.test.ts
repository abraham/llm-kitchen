import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import {
	CharModel,
	CharTrainer,
	CurveNet,
	CurveTrainer,
	activate,
	charExamples,
	layer,
	neuron,
	sampleChars,
	triangleNet
} from './mlp.ts';
import { seededRandom } from './sampling.ts';

/** Compare an analytic gradient with a finite-difference estimate for a few parameters. */
function gradCheck(
	params: Float64Array,
	grad: Float64Array,
	loss: () => number,
	indices: number[],
	eps = 1e-5
) {
	for (const i of indices) {
		const old = params[i];
		params[i] = old + eps;
		const up = loss();
		params[i] = old - eps;
		const down = loss();
		params[i] = old;
		const numeric = (up - down) / (2 * eps);
		expect(grad[i]).toBeCloseTo(numeric, 6);
	}
}

describe('neuron (Ch 6)', () => {
	it('multiplies, adds, and squashes', () => {
		const { sum, output } = neuron([1, 2], [0.5, -1], 0.25, 'relu');
		expect(sum).toBeCloseTo(0.5 - 2 + 0.25);
		expect(output).toBe(0);
		expect(activate('sigmoid', 0)).toBe(0.5);
		expect(activate('tanh', 0)).toBe(0);
		expect(activate('none', -3)).toBe(-3);
	});

	it('a layer runs every neuron on the same inputs', () => {
		const out = layer(
			[1, 2],
			[
				[0.5, -1],
				[1, 1]
			],
			[0.25, 0],
			'relu'
		);
		expect(out.map((n) => n.output)).toEqual([0, 3]);
	});

	it('three neurons and an output fence off a triangle; one alone draws a straight edge', () => {
		const out = (x: number, y: number, on?: boolean[]) => triangleNet([x, y], on).out.output;
		expect(out(0, 0)).toBe(1);
		for (const [x, y] of [
			[0, 1.5],
			[-1.5, -1],
			[1.5, -1]
		])
			expect(out(x, y)).toBe(0);

		const first = [true, false, false];
		expect(out(-2, -1.5, first)).toBe(1);
		expect(out(2, -1.5, first)).toBe(1);
		expect(out(0, 1.5, first)).toBe(0);
	});
});

describe('CurveNet (Ch 7 curve fitting)', () => {
	const xs = Array.from({ length: 20 }, (_, i) => -3 + (6 * i) / 19);
	const ys = xs.map(Math.sin);

	it('computes correct gradients (backpropagation matches finite differences)', () => {
		const net = new CurveNet(6, 1);
		const { grad } = net.lossAndGrad(xs, ys);
		const loss = () => net.lossAndGrad(xs, ys).loss;
		gradCheck(net.w1, grad.w1, loss, [0, 3, 5]);
		gradCheck(net.b1, grad.b1, loss, [1, 4]);
		gradCheck(net.w2, grad.w2, loss, [0, 2]);
		gradCheck(net.b2, grad.b2, loss, [0]);
	});

	it('training lowers the loss', () => {
		const trainer = new CurveTrainer(new CurveNet(16, 2));
		const first = trainer.step(xs, ys);
		let last = first;
		for (let i = 0; i < 1500; i++) last = trainer.step(xs, ys);
		expect(last).toBeLessThan(first / 10);
	});
});

describe('CharModel (Ch 7 tiny language model)', () => {
	const text = RHYMES.map((r) => r.text.toLowerCase());
	const vocab = ['\u0000', ...new Set(text.join(''))].sort();
	const config = { vocab, context: 3, embedding: 8, hidden: 64 };

	it('has fewer than 50,000 parameters (as the chapter says)', () => {
		expect(new CharModel(config, 1).parameterCount).toBeLessThan(50_000);
	});

	it('computes correct gradients for every parameter array', () => {
		const model = new CharModel({ ...config, hidden: 8 }, 3);
		const batch = charExamples(text, vocab, 3).slice(0, 12);
		const { grad } = model.lossAndGrad(batch);
		const loss = () => model.lossAndGrad(batch).loss;
		gradCheck(model.E, grad.E, loss, [0, 17, 40]);
		gradCheck(model.W1, grad.W1, loss, [0, 50, 150]);
		gradCheck(model.b1, grad.b1, loss, [0, 5]);
		gradCheck(model.W2, grad.W2, loss, [0, 99, 200]);
		gradCheck(model.b2, grad.b2, loss, [0, 10]);
	});

	it('starts near the loss of a uniform guess and improves with training', () => {
		const model = new CharModel(config, 4);
		const trainer = new CharTrainer(model);
		const examples = charExamples(text, vocab, 3);
		const random = seededRandom(5);
		const batch = () =>
			Array.from({ length: 32 }, () => examples[Math.floor(random() * examples.length)]);
		const start = model.lossAndGrad(examples).loss;
		expect(start).toBeCloseTo(Math.log(vocab.length), 0);
		for (let i = 0; i < 400; i++) trainer.step(batch());
		expect(model.lossAndGrad(examples).loss).toBeLessThan(start * 0.7);
		expect(sampleChars(model, 40, seededRandom(6)).length).toBeGreaterThan(0);
	});
});
