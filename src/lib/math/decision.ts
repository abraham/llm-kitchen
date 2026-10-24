/**
 * A toy Decision Transformer for `decision-models` (after Chen et al., 2021). A run of a grid game
 * is a sequence of tokens, three per step: the reward still to earn, the cell, and the move. The
 * weights are trained offline by `scripts/record/decisions.py`; this file runs the same network.
 */
import { softmax } from './sampling.ts';

export type Matrix = number[][];

export interface GridWorld {
	size: number;
	/** Cells are numbered row by row from the top left: row × size + column. */
	start: number;
	goal: number;
	pits: number[];
	/** Names of the moves, in the model's order: up, right, down, left. */
	moves: string[];
	horizon: number;
	rewards: { step: number; goal: number; pit: number };
}

export interface DecisionNet {
	width: number;
	layers: number;
	heads: number;
	returnScale: number;
	steps: number;
	finalLoss: number;
	/** PyTorch's state dict: linear weights as (out, in), embeddings as (row, width). */
	weights: Record<string, Matrix | number[]>;
}

export interface DecisionCheck {
	target: number;
	actions: number[];
	return: number;
	end: number;
	firstScores: number[];
}

export interface DecisionRecording {
	model: { id: string; displayName: string; revision: string | null };
	world: GridWorld;
	training: {
		runs: number;
		byPlayer: Record<string, number>;
		byOutcome: Record<string, number>;
		/** How many training runs scored each total. */
		returns: Record<string, number>;
		steps: number;
	};
	net: DecisionNet;
	checks: DecisionCheck[];
}

const DELTAS: [number, number][] = [
	[-1, 0],
	[0, 1],
	[1, 0],
	[0, -1]
];

export type Outcome = 'goal' | 'pit' | 'time';

/** One move in the grid: where it lands, what it earns, and whether the run ends. */
export function move(world: GridWorld, cell: number, action: number) {
	const [dr, dc] = DELTAS[action];
	const r = Math.floor(cell / world.size) + dr;
	const c = (cell % world.size) + dc;
	const inside = r >= 0 && r < world.size && c >= 0 && c < world.size;
	const next = inside ? r * world.size + c : cell;
	const { step, goal, pit } = world.rewards;
	if (next === world.goal) return { cell: next, reward: step + goal, outcome: 'goal' as Outcome };
	if (world.pits.includes(next))
		return { cell: next, reward: step + pit, outcome: 'pit' as Outcome };
	return { cell: next, reward: step, outcome: undefined };
}

const vec = (w: DecisionNet['weights'], name: string) => w[name] as number[];
const mat = (w: DecisionNet['weights'], name: string) => w[name] as Matrix;

function linear(x: readonly number[], weight: Matrix, bias: readonly number[]): number[] {
	return weight.map((row, o) => row.reduce((s, wi, i) => s + wi * x[i], bias[o]));
}

function layerNorm(x: readonly number[], scale: readonly number[], shift: readonly number[]) {
	const mean = x.reduce((a, b) => a + b, 0) / x.length;
	const variance = x.reduce((a, b) => a + (b - mean) ** 2, 0) / x.length;
	const sd = Math.sqrt(variance + 1e-5);
	return x.map((v, i) => ((v - mean) / sd) * scale[i] + shift[i]);
}

const add = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v + b[i]);

/** The token vectors for steps 0..t, ending with step t's cell token (its move isn't known yet). */
function embed(net: DecisionNet, toGo: number[], cells: number[], moves: number[]): number[][] {
	const w = net.weights;
	const tokens: number[][] = [];
	cells.forEach((cell, t) => {
		const when = mat(w, 'step.weight')[t];
		const ret = linear([toGo[t] / net.returnScale], mat(w, 'ret.weight'), vec(w, 'ret.bias'));
		tokens.push(add(ret, when), add(mat(w, 'cell.weight')[cell], when));
		if (t < moves.length) tokens.push(add(mat(w, 'move.weight')[moves[t]], when));
	});
	return tokens.map((x) => layerNorm(x, vec(w, 'ln_in.weight'), vec(w, 'ln_in.bias')));
}

function block(net: DecisionNet, x: number[][], l: number): number[][] {
	const w = net.weights;
	const p = (name: string) => `blocks.${l}.${name}`;
	const d = net.width;
	const size = d / net.heads;
	const qkv = x.map((v) =>
		linear(
			layerNorm(v, vec(w, p('ln1.weight')), vec(w, p('ln1.bias'))),
			mat(w, p('qkv.weight')),
			vec(w, p('qkv.bias'))
		)
	);
	const mixed = x.map((_, i) => {
		const out: number[] = [];
		for (let h = 0; h < net.heads; h++) {
			const q = qkv[i].slice(h * size, (h + 1) * size);
			const scores = qkv
				.slice(0, i + 1)
				.map((r) => q.reduce((s, qv, j) => s + qv * r[d + h * size + j], 0) / Math.sqrt(size));
			const weights = softmax(scores);
			for (let j = 0; j < size; j++)
				out.push(weights.reduce((s, a, k) => s + a * qkv[k][2 * d + h * size + j], 0));
		}
		return out;
	});
	return x.map((v, i) => {
		const h = add(v, linear(mixed[i], mat(w, p('proj.weight')), vec(w, p('proj.bias'))));
		const n = layerNorm(h, vec(w, p('ln2.weight')), vec(w, p('ln2.bias')));
		const hidden = linear(n, mat(w, p('fc.weight')), vec(w, p('fc.bias'))).map((z) =>
			Math.max(0, z)
		);
		return add(h, linear(hidden, mat(w, p('out.weight')), vec(w, p('out.bias'))));
	});
}

/** The model's score for each move at the last step, read from that step's cell token. */
export function moveScores(
	net: DecisionNet,
	toGo: number[],
	cells: number[],
	moves: number[]
): number[] {
	let x = embed(net, toGo, cells, moves);
	for (let l = 0; l < net.layers; l++) x = block(net, x, l);
	const w = net.weights;
	const last = layerNorm(x.at(-1)!, vec(w, 'ln_out.weight'), vec(w, 'ln_out.bias'));
	return linear(last, mat(w, 'head.weight'), vec(w, 'head.bias'));
}

export interface DecisionStep {
	/** The reward still to earn when this step starts. */
	toGo: number;
	cell: number;
	action: number;
	/** The model's probability for each move. */
	probs: number[];
	reward: number;
}

export interface DecisionRun {
	target: number;
	steps: DecisionStep[];
	total: number;
	end: number;
	outcome: Outcome;
}

/** Play greedily, aiming at `target`: after each move, subtract its reward from what's still to earn. */
export function play(world: GridWorld, net: DecisionNet, target: number): DecisionRun {
	const steps: DecisionStep[] = [];
	let cell = world.start;
	let toGo = target;
	for (let t = 0; t < world.horizon; t++) {
		const scores = moveScores(
			net,
			[...steps.map((s) => s.toGo), toGo],
			[...steps.map((s) => s.cell), cell],
			steps.map((s) => s.action)
		);
		const action = scores.indexOf(Math.max(...scores));
		const next = move(world, cell, action);
		steps.push({ toGo, cell, action, probs: softmax(scores), reward: next.reward });
		cell = next.cell;
		toGo -= next.reward;
		if (next.outcome)
			return { target, steps, total: target - toGo, end: cell, outcome: next.outcome };
	}
	return { target, steps, total: target - toGo, end: cell, outcome: 'time' };
}
