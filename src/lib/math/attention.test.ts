import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../../models/canonical.json';
import { parseTrace } from '#lib/models/trace.ts';
import { TOY_ATTENTION, attend } from './attention.ts';

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

describe('recorded GPT-2 attention (Ch 9)', () => {
	const dir = `static/traces/${canonical.id}`;
	const load = (name: string) =>
		parseTrace(JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8')));

	it('has attention for every layer and head on the attention prompts', () => {
		for (const f of readdirSync(dir).filter((f) => f.startsWith('attn-'))) {
			const t = load(f.slice(0, -5));
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
		const at = (name: string, from: string, to: string) => {
			const t = load(name);
			const toks = t.attention!.tokens.map((x) => x.text);
			return t.attention!.weights[9][0][toks.indexOf(from)][toks.indexOf(to)];
		};
		expect(at('attn-mary-lamb', ' its', ' lamb')).toBeGreaterThan(0.85);
		expect(at('attn-trophy-big', ' it', ' suitcase')).toBeGreaterThan(0.5);
		expect(at('attn-trophy-big', ' it', ' trophy')).toBeLessThan(0.1);
	});

	it('most of the time, heads put over half their attention on the first token', () => {
		for (const f of readdirSync(dir).filter((f) => f.startsWith('attn-'))) {
			const t = load(f.slice(0, -5));
			const rows = t.attention!.weights.flat().flatMap((h) => h.slice(3));
			const sink = rows.filter((row) => row[0] > 0.5).length;
			expect(sink / rows.length, f).toBeGreaterThan(0.5);
		}
	});
});

describe('logit lens on "The cat sat on the" (Ch 10)', () => {
	const v = JSON.parse(readFileSync(`static/vectors/${canonical.id}/the-cat-sat.json`, 'utf8'));
	const top = (layer: number) => v.logitLens[layer][0];

	it('has one row per stage: start plus one per block', () => {
		expect(v.lastTokenByLayer).toHaveLength(canonical.layers + 1);
		expect(v.logitLens).toHaveLength(canonical.layers + 1);
	});

	it('the last stage matches the recorded prediction', () => {
		const trace = parseTrace(
			JSON.parse(readFileSync(`static/traces/${canonical.id}/the-cat-sat.json`, 'utf8'))
		);
		const first = trace.steps[0].candidates[0];
		expect(top(canonical.layers).token.text).toBe(first.token.text);
		expect(top(canonical.layers).prob).toBeCloseTo(first.prob, 3);
	});

	it('early blocks guess " same"; " floor" first leads after block 8', () => {
		for (let l = 1; l <= 7; l++) expect(top(l).token.text).toBe(' same');
		expect(top(8).token.text).toBe(' floor');
	});
});
