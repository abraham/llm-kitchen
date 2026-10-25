import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { DATASETS, type TraceName } from '#lib/datasets/registry.ts';
import canonical from '../../../models/canonical.json';
import { TOY_ATTENTION, attend, maskFuture, softmaxRows } from './attention.ts';

describe('recorded scores', () => {
	const d = readDataset('attention/ioi-scores');
	const w = readDataset('traces/attn-ioi').attention!;

	it('are for the same tokens as the recorded weights, every pair, every head', () => {
		expect(d.tokens).toEqual(w.tokens);
		expect(d.headSize).toBe(canonical.embeddingSize / canonical.heads);
		expect(d.scores).toHaveLength(canonical.layers);
		for (const layer of d.scores) {
			expect(layer).toHaveLength(canonical.heads);
			for (const head of layer) for (const row of head) expect(row).toHaveLength(d.tokens.length);
		}
	});

	it('masked and softmaxed give back GPT-2’s own weights', () => {
		let worst = 0;
		d.scores.forEach((layer, l) =>
			layer.forEach((head, h) =>
				softmaxRows(maskFuture(head)).forEach((row, q) =>
					row.forEach((p, k) => (worst = Math.max(worst, Math.abs(p - w.weights[l][h][q][k]))))
				)
			)
		);
		expect(worst).toBeLessThan(0.005);
	});
});

describe('attend', () => {
	const r = attend(TOY_ATTENTION);

	it('masks the future and makes each row sum to 1', () => {
		r.scores.forEach((row, q) => row.forEach((s, k) => expect(s === null).toBe(k > q)));
		for (const row of r.weights) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
		expect(r.weights[0]).toEqual([1, 0, 0, 0]);
	});

	it('divides the dot product by sqrt(d)', () => {
		const [q, k] = [TOY_ATTENTION.queries[3], TOY_ATTENTION.keys[1]];
		expect(r.scores[3][1]).toBeCloseTo((q[0] * k[0] + q[1] * k[1]) / Math.SQRT2);
	});

	it('in the toy example, "it" looks mostly at "trophy" (as the chapter says)', () => {
		const row = r.weights[3];
		expect(row.indexOf(Math.max(...row))).toBe(1);
	});

	it('mixes values by the weights', () => {
		const expected = TOY_ATTENTION.values[0].map((_, j) =>
			r.weights[3].reduce((a, w, k) => a + w * TOY_ATTENTION.values[k][j], 0)
		);
		r.outputs[3].forEach((v, j) => expect(v).toBeCloseTo(expected[j]));
	});
});

describe('recorded GPT-2 attention (attention)', () => {
	const load = (name: TraceName) => readDataset(`traces/${name}`);

	it('has attention for every layer and head on the attention prompts', () => {
		const names = Object.keys(DATASETS).filter((id) => id.startsWith('traces/attn-'));
		expect(names.length).toBeGreaterThan(0);
		for (const id of names) {
			const t = load(id.slice('traces/'.length) as TraceName);
			expect(t.attention!.weights).toHaveLength(canonical.layers);
			for (const layer of t.attention!.weights) expect(layer).toHaveLength(canonical.heads);
		}
	});

	it('GPT-2 predicts " Mary" after "...John gave a drink to" (indirect object)', () => {
		expect(load('attn-ioi').steps[0].chosen.text).toBe(' Mary');
	});

	it('heads 9.6 and 9.9 look from the last word back to " Mary" more than to " John"', () => {
		const t = load('attn-ioi');
		const last = t.tokens.length - 1;
		const mary = t.tokens.findIndex((tok) => tok.text === ' Mary');
		const johns = t.tokens.flatMap((tok, i) => (tok.text === ' John' ? [i] : []));
		for (const [layer, head] of [
			[9, 6],
			[9, 9]
		]) {
			const row = t.attention!.weights[layer][head][last];
			for (const j of johns) expect(row[mary], `${layer}.${head}`).toBeGreaterThan(row[j]);
			expect(row[mary]).toBeGreaterThan(0.3);
		}
	});

	it('in the trophy sentence, attention from " it" is identical for "big" and "small"', () => {
		const big = load('attn-trophy-big');
		const small = load('attn-trophy-small');
		const it = big.tokens.findIndex((t) => t.text === ' it');
		for (let l = 0; l < canonical.layers; l++) {
			for (let h = 0; h < canonical.heads; h++) {
				expect(big.attention!.weights[l][h][it]).toEqual(small.attention!.weights[l][h][it]);
			}
		}
	});

	it('head 9.0 links " its" to " lamb", and " it" to " suitcase" (the chapter’s examples)', () => {
		const at = (name: TraceName, from: string, to: string) => {
			const t = load(name);
			const toks = t.attention!.tokens.map((x) => x.text);
			return t.attention!.weights[9][0][toks.indexOf(from)][toks.indexOf(to)];
		};
		expect(at('attn-mary-lamb', ' its', ' lamb')).toBeGreaterThan(0.85);
		expect(at('attn-trophy-big', ' it', ' suitcase')).toBeGreaterThan(0.5);
		expect(at('attn-trophy-big', ' it', ' trophy')).toBeLessThan(0.1);
	});

	it('most of the time, heads put over half their attention on the first token', () => {
		for (const id of Object.keys(DATASETS).filter((id) => id.startsWith('traces/attn-'))) {
			const t = load(id.slice('traces/'.length) as TraceName);
			const rows = t.attention!.weights.flat().flatMap((h) => h.slice(3));
			const sink = rows.filter((row) => row[0] > 0.5).length;
			expect(sink / rows.length, id).toBeGreaterThan(0.5);
		}
	});
});

describe('logit lens on "The cat sat on the" (the-transformer-block)', () => {
	const v = readDataset(`vectors/the-cat-sat`);
	const top = (layer: number) => v.logitLens[layer][0];

	it('has one row per stage: start plus one per block', () => {
		expect(v.lastTokenByLayer).toHaveLength(canonical.layers + 1);
		expect(v.logitLens).toHaveLength(canonical.layers + 1);
	});

	it('the last stage matches the recorded prediction', () => {
		const trace = readDataset('traces/the-cat-sat');
		const first = trace.steps[0].candidates[0];
		expect(top(canonical.layers).token.text).toBe(first.token.text);
		expect(top(canonical.layers).prob).toBeCloseTo(first.prob, 3);
	});

	it('early blocks guess " same"; " floor" first leads after block 8', () => {
		for (let l = 1; l <= 7; l++) expect(top(l).token.text).toBe(' same');
		expect(top(8).token.text).toBe(' floor');
	});
});
