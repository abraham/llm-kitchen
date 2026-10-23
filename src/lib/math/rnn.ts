/**
 * A tiny character-level recurrent network (Elman, 1990) for `recurrent-models`: it reads one character at a
 * time and carries a fixed-size memory, the hidden state, from each character to the next.
 * Hand-written forward pass and backpropagation through time; tests check the gradients.
 */
import { Adam, init } from './mlp.ts';
import { seededRandom } from './sampling.ts';

type Params = Record<'wx' | 'wh' | 'bh' | 'wy' | 'by', Float64Array>;
const KEYS = ['wx', 'wh', 'bh', 'wy', 'by'] as const;

export class CharRNN {
	readonly vocab: number;
	readonly hidden: number;
	/** wx: vocab x hidden (one row per input character), wh: hidden x hidden, wy: hidden x vocab. */
	p: Params;

	constructor(vocab: number, hidden: number, seed: number) {
		const random = seededRandom(seed);
		this.vocab = vocab;
		this.hidden = hidden;
		this.p = {
			wx: init(vocab * hidden, 0.5, random),
			wh: init(hidden * hidden, 0.8 / Math.sqrt(hidden), random),
			bh: new Float64Array(hidden),
			wy: init(hidden * vocab, 0.3 / Math.sqrt(hidden), random),
			by: new Float64Array(vocab)
		};
	}

	get parameterCount(): number {
		return KEYS.reduce((a, k) => a + this.p[k].length, 0);
	}

	/** Read one character: the new memory, and the probability of each next character. */
	step(h: Float64Array, c: number): { h: Float64Array; probs: Float64Array } {
		const { wx, wh, bh, wy, by } = this.p;
		const H = this.hidden;
		const V = this.vocab;
		const next = new Float64Array(H);
		for (let j = 0; j < H; j++) {
			let z = bh[j] + wx[c * H + j];
			for (let i = 0; i < H; i++) z += h[i] * wh[i * H + j];
			next[j] = Math.tanh(z);
		}
		const probs = new Float64Array(V);
		let max = -Infinity;
		for (let k = 0; k < V; k++) {
			let z = by[k];
			for (let j = 0; j < H; j++) z += next[j] * wy[j * V + k];
			probs[k] = z;
			if (z > max) max = z;
		}
		let sum = 0;
		for (let k = 0; k < V; k++) sum += probs[k] = Math.exp(probs[k] - max);
		for (let k = 0; k < V; k++) probs[k] /= sum;
		return { h: next, probs };
	}

	/** Average loss of predicting each next character of every sequence, and its gradients. */
	lossAndGrad(sequences: number[][]): { loss: number; grad: Params } {
		const H = this.hidden;
		const V = this.vocab;
		const { wh, wy } = this.p;
		const grad = Object.fromEntries(
			KEYS.map((k) => [k, new Float64Array(this.p[k].length)])
		) as Params;
		const count = sequences.reduce((a, s) => a + s.length - 1, 0);
		let loss = 0;
		for (const seq of sequences) {
			const hs: Float64Array[] = [new Float64Array(H)];
			const ps: Float64Array[] = [];
			for (let t = 0; t < seq.length - 1; t++) {
				const out = this.step(hs[t], seq[t]);
				hs.push(out.h);
				ps.push(out.probs);
				loss -= Math.log(out.probs[seq[t + 1]] + 1e-12) / count;
			}
			let carry = new Float64Array(H);
			for (let t = seq.length - 2; t >= 0; t--) {
				const h = hs[t + 1];
				const prev = hs[t];
				const dy = Float64Array.from(ps[t], (p, k) => (p - (k === seq[t + 1] ? 1 : 0)) / count);
				const dz = new Float64Array(H);
				for (let j = 0; j < H; j++) {
					let dh = carry[j];
					for (let k = 0; k < V; k++) {
						grad.wy[j * V + k] += h[j] * dy[k];
						dh += wy[j * V + k] * dy[k];
					}
					dz[j] = dh * (1 - h[j] * h[j]);
				}
				for (let k = 0; k < V; k++) grad.by[k] += dy[k];
				carry = new Float64Array(H);
				for (let j = 0; j < H; j++) {
					grad.bh[j] += dz[j];
					grad.wx[seq[t] * H + j] += dz[j];
				}
				for (let i = 0; i < H; i++) {
					let back = 0;
					for (let j = 0; j < H; j++) {
						grad.wh[i * H + j] += prev[i] * dz[j];
						back += wh[i * H + j] * dz[j];
					}
					carry[i] = back;
				}
			}
		}
		return { loss, grad };
	}
}

export class RNNTrainer {
	readonly model: CharRNN;
	private opt: Record<(typeof KEYS)[number], Adam>;
	steps = 0;

	constructor(model: CharRNN) {
		this.model = model;
		this.opt = Object.fromEntries(KEYS.map((k) => [k, new Adam(model.p[k].length)])) as Record<
			(typeof KEYS)[number],
			Adam
		>;
	}

	step(sequences: number[][], lr = 0.01): number {
		const { loss, grad } = this.model.lossAndGrad(sequences);
		for (const k of KEYS) {
			// Clip, so a rare huge gradient (common in recurrent nets) can't wreck the weights.
			for (let i = 0; i < grad[k].length; i++) grad[k][i] = Math.max(-5, Math.min(5, grad[k][i]));
			this.opt[k].step(this.model.p[k], grad[k], lr);
		}
		this.steps++;
		return loss;
	}
}
