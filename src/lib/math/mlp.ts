/**
 * Tiny neural networks with hand-written forward and backward passes (no libraries), used by
 * Ch 6 and Ch 7. Everything is small enough to read; tests check the gradients numerically.
 */
import { seededRandom } from './sampling.ts';

export type Activation = 'none' | 'relu' | 'tanh' | 'sigmoid';

export function activate(kind: Activation, z: number): number {
	switch (kind) {
		case 'none':
			return z;
		case 'relu':
			return Math.max(0, z);
		case 'tanh':
			return Math.tanh(z);
		case 'sigmoid':
			return 1 / (1 + Math.exp(-z));
	}
}

/** One neuron: weighted sum of inputs plus bias, then an activation function. */
export function neuron(inputs: number[], weights: number[], bias: number, kind: Activation) {
	const sum = inputs.reduce((a, x, i) => a + x * weights[i], bias);
	return { sum, output: activate(kind, sum) };
}

/** A layer: neurons side by side, each reading all the same inputs with its own weights and bias. */
export function layer(inputs: number[], weights: number[][], biases: number[], kind: Activation) {
	return weights.map((w, i) => neuron(inputs, w, biases[i], kind));
}

/** Ch 6's network: three ReLU neurons, one per triangle edge, feed an output that is 1 inside. */
export const TRIANGLE = {
	weights: [
		[0, 1],
		[-0.87, -0.5],
		[0.87, -0.5]
	],
	biases: [-0.8, -0.8, -0.8],
	outWeight: -3,
	outBias: 1
};

export function triangleNet(inputs: number[], on: boolean[] = [true, true, true]) {
	const hidden = layer(inputs, TRIANGLE.weights, TRIANGLE.biases, 'relu');
	const out = neuron(
		hidden.map((h) => h.output),
		on.map((o) => (o ? TRIANGLE.outWeight : 0)),
		TRIANGLE.outBias,
		'relu'
	);
	return { hidden, out };
}

export function gaussian(random: () => number): number {
	const u = 1 - random();
	const v = random();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function init(n: number, scale: number, random: () => number): Float64Array {
	return Float64Array.from({ length: n }, () => gaussian(random) * scale);
}

/** Adam optimizer state for one parameter array (Kingma & Ba, 2015). */
export class Adam {
	private m: Float64Array;
	private v: Float64Array;
	private t = 0;
	constructor(size: number) {
		this.m = new Float64Array(size);
		this.v = new Float64Array(size);
	}
	step(param: Float64Array, grad: Float64Array, lr: number, b1 = 0.9, b2 = 0.999, eps = 1e-8) {
		this.t++;
		const c1 = 1 - b1 ** this.t;
		const c2 = 1 - b2 ** this.t;
		for (let i = 0; i < param.length; i++) {
			this.m[i] = b1 * this.m[i] + (1 - b1) * grad[i];
			this.v[i] = b2 * this.v[i] + (1 - b2) * grad[i] * grad[i];
			param[i] -= (lr * (this.m[i] / c1)) / (Math.sqrt(this.v[i] / c2) + eps);
		}
	}
}

/* ------------------------------------------------------------------------------------------ */
/* Curve fitter: 1 input -> H tanh neurons -> 1 output, mean squared error.                    */
/* ------------------------------------------------------------------------------------------ */

export class CurveNet {
	readonly hidden: number;
	w1: Float64Array;
	b1: Float64Array;
	w2: Float64Array;
	b2: Float64Array;

	constructor(hidden: number, seed: number) {
		const random = seededRandom(seed);
		this.hidden = hidden;
		this.w1 = init(hidden, 1.5, random);
		this.b1 = init(hidden, 1, random);
		this.w2 = init(hidden, 1 / Math.sqrt(hidden), random);
		this.b2 = new Float64Array(1);
	}

	predict(x: number): number {
		let y = this.b2[0];
		for (let j = 0; j < this.hidden; j++) y += this.w2[j] * Math.tanh(this.w1[j] * x + this.b1[j]);
		return y;
	}

	/** Mean squared error over the points, and its gradient for every parameter. */
	lossAndGrad(xs: number[], ys: number[]) {
		const H = this.hidden;
		const g = {
			w1: new Float64Array(H),
			b1: new Float64Array(H),
			w2: new Float64Array(H),
			b2: new Float64Array(1)
		};
		let loss = 0;
		const n = xs.length;
		const h = new Float64Array(H);
		for (let i = 0; i < n; i++) {
			let y = this.b2[0];
			for (let j = 0; j < H; j++) {
				h[j] = Math.tanh(this.w1[j] * xs[i] + this.b1[j]);
				y += this.w2[j] * h[j];
			}
			const err = y - ys[i];
			loss += (err * err) / n;
			const dy = (2 * err) / n;
			g.b2[0] += dy;
			for (let j = 0; j < H; j++) {
				g.w2[j] += dy * h[j];
				const dz = dy * this.w2[j] * (1 - h[j] * h[j]);
				g.w1[j] += dz * xs[i];
				g.b1[j] += dz;
			}
		}
		return { loss, grad: g };
	}
}

export class CurveTrainer {
	readonly net: CurveNet;
	private opt: Record<'w1' | 'b1' | 'w2' | 'b2', Adam>;
	steps = 0;

	constructor(net: CurveNet) {
		this.net = net;
		this.opt = {
			w1: new Adam(net.hidden),
			b1: new Adam(net.hidden),
			w2: new Adam(net.hidden),
			b2: new Adam(1)
		};
	}

	step(xs: number[], ys: number[], lr = 0.02): number {
		const { loss, grad } = this.net.lossAndGrad(xs, ys);
		for (const k of ['w1', 'b1', 'w2', 'b2'] as const) this.opt[k].step(this.net[k], grad[k], lr);
		this.steps++;
		return loss;
	}
}

/* ------------------------------------------------------------------------------------------ */
/* Character-level language model: previous `context` characters -> next character.          */
/* Embedding -> one tanh hidden layer -> softmax. The shape of Bengio et al. (2003), tiny.    */
/* ------------------------------------------------------------------------------------------ */

export interface CharModelConfig {
	vocab: string[];
	context: number;
	embedding: number;
	hidden: number;
}

export class CharModel {
	readonly config: CharModelConfig;
	readonly V: number;
	E: Float64Array; // V x embedding
	W1: Float64Array; // (context * embedding) x hidden
	b1: Float64Array;
	W2: Float64Array; // hidden x V
	b2: Float64Array;

	constructor(config: CharModelConfig, seed: number) {
		const random = seededRandom(seed);
		const { context, embedding, hidden } = config;
		this.config = config;
		this.V = config.vocab.length;
		const inDim = context * embedding;
		this.E = init(this.V * embedding, 1, random);
		this.W1 = init(inDim * hidden, 1 / Math.sqrt(inDim), random);
		this.b1 = new Float64Array(hidden);
		this.W2 = init(hidden * this.V, 0.1 / Math.sqrt(hidden), random);
		this.b2 = new Float64Array(this.V);
	}

	get parameterCount(): number {
		return this.E.length + this.W1.length + this.b1.length + this.W2.length + this.b2.length;
	}

	/** Probabilities for the next character after the `context` character indices. */
	probabilities(ctx: number[]): Float64Array {
		const { embedding: D, hidden: H } = this.config;
		const x = new Float64Array(ctx.length * D);
		ctx.forEach((c, i) => x.set(this.E.subarray(c * D, c * D + D), i * D));
		const h = new Float64Array(H);
		for (let j = 0; j < H; j++) {
			let z = this.b1[j];
			for (let i = 0; i < x.length; i++) z += x[i] * this.W1[i * H + j];
			h[j] = Math.tanh(z);
		}
		const logits = new Float64Array(this.V);
		for (let k = 0; k < this.V; k++) {
			let z = this.b2[k];
			for (let j = 0; j < H; j++) z += h[j] * this.W2[j * this.V + k];
			logits[k] = z;
		}
		const max = Math.max(...logits);
		let sum = 0;
		for (let k = 0; k < this.V; k++) sum += logits[k] = Math.exp(logits[k] - max);
		for (let k = 0; k < this.V; k++) logits[k] /= sum;
		return logits;
	}

	/** Average cross-entropy loss (in nats) over examples, and gradients for every parameter. */
	lossAndGrad(examples: { ctx: number[]; next: number }[]) {
		const { embedding: D, hidden: H } = this.config;
		const V = this.V;
		const g = {
			E: new Float64Array(this.E.length),
			W1: new Float64Array(this.W1.length),
			b1: new Float64Array(H),
			W2: new Float64Array(this.W2.length),
			b2: new Float64Array(V)
		};
		const n = examples.length;
		let loss = 0;
		const x = new Float64Array(this.config.context * D);
		const h = new Float64Array(H);
		const dh = new Float64Array(H);
		const dx = new Float64Array(x.length);

		for (const { ctx, next } of examples) {
			ctx.forEach((c, i) => x.set(this.E.subarray(c * D, c * D + D), i * D));
			for (let j = 0; j < H; j++) {
				let z = this.b1[j];
				for (let i = 0; i < x.length; i++) z += x[i] * this.W1[i * H + j];
				h[j] = Math.tanh(z);
			}
			const p = new Float64Array(V);
			let max = -Infinity;
			for (let k = 0; k < V; k++) {
				let z = this.b2[k];
				for (let j = 0; j < H; j++) z += h[j] * this.W2[j * V + k];
				p[k] = z;
				if (z > max) max = z;
			}
			let sum = 0;
			for (let k = 0; k < V; k++) sum += p[k] = Math.exp(p[k] - max);
			for (let k = 0; k < V; k++) p[k] /= sum;
			loss -= Math.log(p[next]) / n;

			// d loss / d logits = p - onehot(next)
			dh.fill(0);
			for (let k = 0; k < V; k++) {
				const dz = (p[k] - (k === next ? 1 : 0)) / n;
				g.b2[k] += dz;
				for (let j = 0; j < H; j++) {
					g.W2[j * V + k] += h[j] * dz;
					dh[j] += this.W2[j * V + k] * dz;
				}
			}
			dx.fill(0);
			for (let j = 0; j < H; j++) {
				const dz = dh[j] * (1 - h[j] * h[j]);
				g.b1[j] += dz;
				for (let i = 0; i < x.length; i++) {
					g.W1[i * H + j] += x[i] * dz;
					dx[i] += this.W1[i * H + j] * dz;
				}
			}
			ctx.forEach((c, i) => {
				for (let d = 0; d < D; d++) g.E[c * D + d] += dx[i * D + d];
			});
		}
		return { loss, grad: g };
	}
}

export class CharTrainer {
	readonly model: CharModel;
	private opt: Record<'E' | 'W1' | 'b1' | 'W2' | 'b2', Adam>;
	steps = 0;

	constructor(model: CharModel) {
		this.model = model;
		this.opt = {
			E: new Adam(model.E.length),
			W1: new Adam(model.W1.length),
			b1: new Adam(model.b1.length),
			W2: new Adam(model.W2.length),
			b2: new Adam(model.b2.length)
		};
	}

	step(batch: { ctx: number[]; next: number }[], lr = 0.01): number {
		const { loss, grad } = this.model.lossAndGrad(batch);
		for (const k of ['E', 'W1', 'b1', 'W2', 'b2'] as const)
			this.opt[k].step(this.model[k], grad[k], lr);
		this.steps++;
		return loss;
	}
}

/** Turn text into (previous `context` characters -> next character) examples. Index 0 pads. */
export function charExamples(texts: string[], vocab: string[], context: number) {
	const index = new Map(vocab.map((c, i) => [c, i]));
	const examples: { ctx: number[]; next: number }[] = [];
	for (const text of texts) {
		const ids = [...Array(context).fill(0), ...[...text].map((c) => index.get(c) ?? 0), 0];
		for (let i = context; i < ids.length; i++) {
			examples.push({ ctx: ids.slice(i - context, i), next: ids[i] });
		}
	}
	return examples;
}

/** Sample text from the model, one character at a time, until the end marker or `max` characters. */
export function sampleChars(model: CharModel, max: number, random: () => number): string {
	const { vocab, context } = model.config;
	const ctx = Array(context).fill(0);
	let out = '';
	for (let i = 0; i < max; i++) {
		const p = model.probabilities(ctx);
		let u = random();
		let k = 0;
		while (k < p.length - 1 && (u -= p[k]) >= 0) k++;
		if (k === 0) break;
		out += vocab[k];
		ctx.shift();
		ctx.push(k);
	}
	return out;
}
