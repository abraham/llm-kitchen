import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { bm25, fuse, keywords, ranking, search } from './search.ts';

const context = readDataset('agent/context');
const recorded = readDataset('agent/search');
const texts = context.turns.map((t) => t.text);
const vectors = context.turns.map((t) => t.vector);
const run = (i: number) => search(recorded.questions[i], texts, vectors);

describe('keyword search', () => {
	it('drops common words', () => {
		expect(keywords("Which rhyme does Leo love? The king's men")).toEqual([
			'rhyme',
			'leo',
			'love',
			"king's",
			'men'
		]);
	});

	it('scores rare words above common ones and ignores texts without the word', () => {
		const scores = bm25('cat rhyme', ['the cat rhyme', 'a dog rhyme', 'a cow rhyme', 'a dog']);
		expect(scores[0]).toBeGreaterThan(scores[1]);
		expect(scores[1]).toBeGreaterThan(0);
		expect(scores[3]).toBe(0);
	});

	it('ranks by score and drops zeros unless asked', () => {
		expect(ranking([0, 2, 1])).toEqual([1, 2]);
		expect(ranking([0, 2, 1], true)).toEqual([1, 2, 0]);
	});

	it('fuses ranks: first in one list and third in the other beats second in both', () => {
		const scores = fuse(
			[
				[0, 1, 2],
				[1, 2, 0]
			],
			3
		);
		expect(scores[1]).toBeGreaterThan(scores[0]);
		expect(scores[0]).toBeGreaterThan(scores[2]);
	});
});

describe('the recorded questions', () => {
	it('embed the first question exactly as the chat recording did', () => {
		expect(recorded.questions[0].vector).toEqual(context.questionVector);
		expect(recorded.embedder).toEqual(context.embedder);
	});

	it('put the right exchange first: keywords, meaning, both', () => {
		const firsts = recorded.questions.map((q, i) => {
			const r = run(i);
			return [r.keyword.order[0] ?? null, r.meaning.order[0], r.both.order[0], q.about];
		});
		expect(firsts).toEqual([
			[0, 0, 0, 0],
			[null, 0, 0, 0],
			[3, 4, 3, 3],
			[2, 3, 2, 2],
			[5, 4, 4, 5]
		]);
	});
});
