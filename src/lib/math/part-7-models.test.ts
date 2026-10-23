import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import {
	ALPHA_BARS,
	Denoiser,
	DiffusionTrainer,
	STEPS,
	generate,
	noisyExample,
	shapePoint,
	type Point
} from './diffusion.ts';
import { CharRNN, RNNTrainer } from './rnn.ts';
import { Router } from './router.ts';
import { seededRandom } from './sampling.ts';

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
		expect(grad[i]).toBeCloseTo((up - down) / (2 * eps), 6);
	}
}

describe('Router (Ch 23)', () => {
	it('sends each token to its k best experts, with weights that add up to 1', () => {
		const router = new Router(8, 16, 3);
		const random = seededRandom(4);
		const x = Array.from({ length: 16 }, () => random() * 2 - 1);
		const { probs, chosen, weights } = router.route(x, 2);
		expect(chosen).toHaveLength(2);
		const sorted = [...probs].sort((a, b) => b - a);
		expect(chosen.map((e) => probs[e])).toEqual(sorted.slice(0, 2));
		expect(weights.reduce((a, b) => a + b)).toBeCloseTo(1);
	});
});

describe('CharRNN (Ch 24)', () => {
	const text = RHYMES[0].text.toLowerCase();
	const vocab = [...new Set(text)].sort();
	const seq = [...text.slice(0, 20)].map((c) => vocab.indexOf(c));

	it('computes correct gradients (backpropagation through time matches finite differences)', () => {
		const model = new CharRNN(vocab.length, 6, 1);
		const { grad } = model.lossAndGrad([seq]);
		const loss = () => model.lossAndGrad([seq]).loss;
		gradCheck(model.p.wx, grad.wx, loss, [seq[0] * 6, seq[3] * 6 + 2]);
		gradCheck(model.p.wh, grad.wh, loss, [0, 7, 20]);
		gradCheck(model.p.bh, grad.bh, loss, [1, 5]);
		gradCheck(model.p.wy, grad.wy, loss, [0, 10]);
		gradCheck(model.p.by, grad.by, loss, [seq[1]]);
	});

	it('keeps the same amount of memory however much it has read', () => {
		const model = new CharRNN(vocab.length, 8, 1);
		let h: Float64Array = new Float64Array(8);
		for (const c of seq) h = model.step(h, c).h;
		expect(h).toHaveLength(8);
	});

	it('learns: the loss falls well below guessing', () => {
		const texts = RHYMES.map((r) => r.text.toLowerCase());
		const v = [...new Set(texts.join(''))].sort();
		const random = seededRandom(2);
		const trainer = new RNNTrainer(new CharRNN(v.length, 24, 2));
		const batch = () =>
			Array.from({ length: 8 }, () => {
				const t = texts[Math.floor(random() * texts.length)];
				const start = Math.floor(random() * (t.length - 20));
				return [...t.slice(start, start + 20)].map((c) => v.indexOf(c));
			});
		const first = trainer.step(batch());
		let loss = first;
		for (let i = 0; i < 400; i++) loss = trainer.step(batch());
		expect(first).toBeGreaterThan(0.9 * Math.log(v.length));
		expect(loss).toBeLessThan(0.75 * first);
	});
});

describe('Diffusion (Ch 26)', () => {
	it('noises points until almost nothing of the original is left', () => {
		expect(ALPHA_BARS[0]).toBeGreaterThan(0.99);
		expect(ALPHA_BARS[STEPS - 1]).toBeLessThan(0.01);
	});

	it('computes correct gradients (backpropagation matches finite differences)', () => {
		const random = seededRandom(5);
		const model = new Denoiser(6, random);
		const batch = Array.from({ length: 4 }, () => noisyExample(shapePoint('ring', random), random));
		const { grad } = model.lossAndGrad(batch);
		const loss = () => model.lossAndGrad(batch).loss;
		gradCheck(model.p.w1, grad.w1, loss, [0, 13, 40]);
		gradCheck(model.p.b1, grad.b1, loss, [2]);
		gradCheck(model.p.w2, grad.w2, loss, [5, 30]);
		gradCheck(model.p.w3, grad.w3, loss, [1, 8]);
		gradCheck(model.p.b3, grad.b3, loss, [0, 1]);
	});

	it('learns to turn noise into the shape', () => {
		const random = seededRandom(7);
		const trainer = new DiffusionTrainer(new Denoiser(32, random));
		for (let i = 0; i < 1500; i++) trainer.step('ring', random);
		const frames = generate(trainer.model, 200, random);
		// For a ring of radius 1.2, how far is each point from the ring?
		const off = (pts: Point[]) =>
			pts.reduce((a, [x, y]) => a + Math.abs(Math.hypot(x, y) - 1.2), 0) / pts.length;
		expect(frames).toHaveLength(STEPS + 1);
		expect(off(frames[STEPS])).toBeLessThan(0.4 * off(frames[0]));
	});
});
