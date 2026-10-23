/**
 * A toy diffusion model on 2D points for `diffusion` (after Ho et al., 2020): noise is added to points from
 * a shape in many small steps, and a tiny network learns to predict the noise so it can be removed
 * one step at a time. Hand-written network and backpropagation; tests check the gradients.
 */
import { Adam, gaussian, init } from './mlp.ts';

export const STEPS = 50;

/** How much noise each step adds (beta), and how much of the original is left after t steps. */
export const BETAS = Array.from(
	{ length: STEPS },
	(_, i) => 1e-3 + ((0.2 - 1e-3) * i) / (STEPS - 1)
);
export const ALPHA_BARS = BETAS.reduce<number[]>(
	(acc, b) => [...acc, (acc.at(-1) ?? 1) * (1 - b)],
	[]
);

export type Point = [number, number];
export type Shape = 'ring' | 'square' | 'two blobs';

export function shapePoint(shape: Shape, random: () => number): Point {
	const jitter = () => gaussian(random) * 0.04;
	if (shape === 'square') {
		const s = random() * 4;
		const side = Math.floor(s);
		const f = (s - side) * 2.4 - 1.2;
		const corners: Point[] = [
			[f, -1.2],
			[1.2, f],
			[-f, 1.2],
			[-1.2, -f]
		];
		return [corners[side][0] + jitter(), corners[side][1] + jitter()];
	}
	if (shape === 'ring') {
		const a = 2 * Math.PI * random();
		return [1.2 * Math.cos(a) + jitter(), 1.2 * Math.sin(a) + jitter()];
	}
	const side = random() < 0.5 ? -1 : 1;
	return [side * 0.9 + gaussian(random) * 0.2, gaussian(random) * 0.2];
}

const FREQS = 4;
const INPUTS = 2 + 2 * FREQS;

function features(x: number, y: number, t: number): Float64Array {
	const f = new Float64Array(INPUTS);
	f[0] = x;
	f[1] = y;
	for (let k = 0; k < FREQS; k++) {
		const w = (2 ** k * Math.PI * (t + 1)) / STEPS;
		f[2 + 2 * k] = Math.sin(w);
		f[3 + 2 * k] = Math.cos(w);
	}
	return f;
}

type Params = Record<'w1' | 'b1' | 'w2' | 'b2' | 'w3' | 'b3', Float64Array>;
const KEYS = ['w1', 'b1', 'w2', 'b2', 'w3', 'b3'] as const;

export interface Example {
	/** The noisy point at step t. */
	x: number;
	y: number;
	t: number;
	/** The noise that was added, which the network should predict. */
	noise: Point;
}

/** Input point and step -> two layers of ReLU neurons -> the predicted noise. */
export class Denoiser {
	readonly hidden: number;
	p: Params;

	constructor(hidden: number, random: () => number) {
		this.hidden = hidden;
		this.p = {
			w1: init(INPUTS * hidden, Math.sqrt(2 / INPUTS), random),
			b1: new Float64Array(hidden),
			w2: init(hidden * hidden, Math.sqrt(2 / hidden), random),
			b2: new Float64Array(hidden),
			w3: init(hidden * 2, Math.sqrt(1 / hidden), random),
			b3: new Float64Array(2)
		};
	}

	private forward(x: number, y: number, t: number) {
		const H = this.hidden;
		const { w1, b1, w2, b2, w3, b3 } = this.p;
		const f = features(x, y, t);
		const h1 = new Float64Array(H);
		for (let j = 0; j < H; j++) {
			let z = b1[j];
			for (let i = 0; i < INPUTS; i++) z += f[i] * w1[i * H + j];
			h1[j] = Math.max(0, z);
		}
		const h2 = new Float64Array(H);
		for (let j = 0; j < H; j++) {
			let z = b2[j];
			for (let i = 0; i < H; i++) z += h1[i] * w2[i * H + j];
			h2[j] = Math.max(0, z);
		}
		const out: Point = [b3[0], b3[1]];
		for (let j = 0; j < H; j++) {
			out[0] += h2[j] * w3[j * 2];
			out[1] += h2[j] * w3[j * 2 + 1];
		}
		return { f, h1, h2, out };
	}

	predict(x: number, y: number, t: number): Point {
		return this.forward(x, y, t).out;
	}

	/** Mean squared error of the predicted noise, and its gradient for every parameter. */
	lossAndGrad(batch: Example[]): { loss: number; grad: Params } {
		const H = this.hidden;
		const { w2, w3 } = this.p;
		const grad = Object.fromEntries(
			KEYS.map((k) => [k, new Float64Array(this.p[k].length)])
		) as Params;
		const n = batch.length;
		let loss = 0;
		for (const ex of batch) {
			const { f, h1, h2, out } = this.forward(ex.x, ex.y, ex.t);
			const d = [(out[0] - ex.noise[0]) / n, (out[1] - ex.noise[1]) / n];
			loss += ((out[0] - ex.noise[0]) ** 2 + (out[1] - ex.noise[1]) ** 2) / (2 * n);
			grad.b3[0] += d[0];
			grad.b3[1] += d[1];
			const d2 = new Float64Array(H);
			for (let j = 0; j < H; j++) {
				grad.w3[j * 2] += h2[j] * d[0];
				grad.w3[j * 2 + 1] += h2[j] * d[1];
				d2[j] = h2[j] > 0 ? w3[j * 2] * d[0] + w3[j * 2 + 1] * d[1] : 0;
			}
			const d1 = new Float64Array(H);
			for (let i = 0; i < H; i++) {
				let back = 0;
				for (let j = 0; j < H; j++) {
					grad.w2[i * H + j] += h1[i] * d2[j];
					back += w2[i * H + j] * d2[j];
				}
				d1[i] = h1[i] > 0 ? back : 0;
			}
			for (let j = 0; j < H; j++) {
				grad.b2[j] += d2[j];
				grad.b1[j] += d1[j];
				for (let i = 0; i < INPUTS; i++) grad.w1[i * H + j] += f[i] * d1[j];
			}
		}
		return { loss, grad };
	}
}

/** A training example: a point from the shape, noised to a random step. */
export function noisyExample(point: Point, random: () => number): Example {
	const t = Math.floor(random() * STEPS);
	const noise: Point = [gaussian(random), gaussian(random)];
	const keep = Math.sqrt(ALPHA_BARS[t]);
	const add = Math.sqrt(1 - ALPHA_BARS[t]);
	return { x: keep * point[0] + add * noise[0], y: keep * point[1] + add * noise[1], t, noise };
}

export class DiffusionTrainer {
	readonly model: Denoiser;
	private opt: Record<(typeof KEYS)[number], Adam>;
	steps = 0;

	constructor(model: Denoiser) {
		this.model = model;
		this.opt = Object.fromEntries(KEYS.map((k) => [k, new Adam(model.p[k].length)])) as Record<
			(typeof KEYS)[number],
			Adam
		>;
	}

	step(shape: Shape, random: () => number, batchSize = 64, lr = 3e-3): number {
		const batch = Array.from({ length: batchSize }, () =>
			noisyExample(shapePoint(shape, random), random)
		);
		const { loss, grad } = this.model.lossAndGrad(batch);
		for (const k of KEYS) this.opt[k].step(this.model.p[k], grad[k], lr);
		this.steps++;
		return loss;
	}
}

/**
 * Start from pure noise and remove the predicted noise one step at a time.
 * Returns the points at every step: frames[0] is pure noise, frames[STEPS] the finished picture.
 */
export function generate(model: Denoiser, count: number, random: () => number): Point[][] {
	let points: Point[] = Array.from({ length: count }, () => [gaussian(random), gaussian(random)]);
	const frames = [points];
	for (let t = STEPS - 1; t >= 0; t--) {
		const beta = BETAS[t];
		const scale = beta / Math.sqrt(1 - ALPHA_BARS[t]);
		// Ho et al.'s smaller choice of fresh noise: none at the last step, little near the end.
		const spread = t > 0 ? Math.sqrt((beta * (1 - ALPHA_BARS[t - 1])) / (1 - ALPHA_BARS[t])) : 0;
		points = points.map(([x, y]) => {
			const [ex, ey] = model.predict(x, y, t);
			return [
				(x - scale * ex) / Math.sqrt(1 - beta) + spread * gaussian(random),
				(y - scale * ey) / Math.sqrt(1 - beta) + spread * gaussian(random)
			];
		});
		frames.push(points);
	}
	return frames;
}
