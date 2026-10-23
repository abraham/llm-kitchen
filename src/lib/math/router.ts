import { init } from './mlp.ts';
import { seededRandom, softmax } from './sampling.ts';

export interface Route {
	/** The router's probability for every expert. */
	probs: number[];
	/** The experts this token goes to, best first. */
	chosen: number[];
	/** How much each chosen expert's output counts, adding up to 1. */
	weights: number[];
}

/** A mixture-of-experts router: score every expert, softmax, keep the top k (Shazeer et al., 2017). */
export class Router {
	readonly experts: number;
	readonly dim: number;
	readonly sharpness: number;
	private readonly w: Float64Array;

	constructor(experts: number, dim: number, seed: number, sharpness = 2) {
		this.experts = experts;
		this.dim = dim;
		this.sharpness = sharpness;
		this.w = init(experts * dim, 1, seededRandom(seed));
	}

	route(x: readonly number[], k: number): Route {
		// Scores depend on the vector's direction, not its length.
		const norm = Math.hypot(...x) || 1;
		const scores = Array.from({ length: this.experts }, (_, e) => {
			let s = 0;
			for (let i = 0; i < this.dim; i++) s += this.w[e * this.dim + i] * x[i];
			return (s / norm) * this.sharpness;
		});
		const probs = softmax(scores);
		const chosen = probs
			.map((p, e) => [p, e] as const)
			.sort((a, b) => b[0] - a[0])
			.slice(0, k)
			.map(([, e]) => e);
		const total = chosen.reduce((a, e) => a + probs[e], 0);
		return { probs, chosen, weights: chosen.map((e) => probs[e] / total) };
	}
}
