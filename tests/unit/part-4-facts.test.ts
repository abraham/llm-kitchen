// Checks that the numbers and examples in the Part IV prose match the data the widgets show.
// (Attention facts for Ch 9 are in src/lib/math/attention.test.ts.)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';
import { parameterBreakdown } from '../../src/lib/math/transformer.ts';
import type { TokenVectors } from '../../src/lib/models/load-json.ts';

describe('Ch 8: the context problem', () => {
	it('"about 2.5 billion possible pairs and about 127 trillion possible triples"', () => {
		expect(canonical.vocabularySize ** 2 / 1e9).toBeCloseTo(2.5, 1);
		expect(Math.round(canonical.vocabularySize ** 3 / 1e12)).toBe(127);
	});

	it('"GPT-2 can look at up to 1,024 tokens"', () => {
		expect(canonical.contextLength).toBe(1024);
	});
});

describe('Ch 10: the transformer block', () => {
	const p = parameterBreakdown(canonical);

	it('"about a third are in the token and position tables"', () => {
		expect(p.embeddings / p.total).toBeGreaterThan(0.3);
		expect(p.embeddings / p.total).toBeLessThan(0.34);
	});

	it('"almost half are in the MLPs"; "attention has fewer than a quarter"', () => {
		expect((canonical.layers * p.mlp) / p.total).toBeGreaterThan(0.44);
		expect((canonical.layers * p.mlp) / p.total).toBeLessThan(0.5);
		expect((canonical.layers * p.attention) / p.total).toBeLessThan(0.25);
	});

	const v: TokenVectors = JSON.parse(
		readFileSync(`static/vectors/${canonical.id}/the-cat-sat.json`, 'utf8')
	);
	const tops = (layer: number, n = 3) => v.logitLens[layer].slice(0, n).map((c) => c.token.text);

	it('"from block 8 on, floor is at or near the top (ground edges ahead once)"', () => {
		for (let l = 8; l <= canonical.layers; l++) expect(tops(l, 2)).toContain(' floor');
		const leaders = [8, 9, 10, 11, 12].map((l) => tops(l, 1)[0]);
		expect(leaders.filter((t) => t === ' ground')).toHaveLength(1);
	});

	it('"furniture appears: table, sofa, bed"', () => {
		const seen = new Set([8, 9, 10, 11].flatMap((l) => tops(l)));
		for (const word of [' table', ' sofa', ' bed']) expect(seen).toContain(word);
	});

	it('"the last block spreads the bets out, ending at floor, bed, and couch"', () => {
		expect(v.logitLens[canonical.layers][0].prob).toBeLessThan(
			v.logitLens[canonical.layers - 1][0].prob
		);
		expect(tops(canonical.layers)).toEqual([' floor', ' bed', ' couch']);
	});
});
