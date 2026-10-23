import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import { bigramCounts, bigramPairs, generateBigram, nextWordProbs, words } from './bigram.ts';
import { seededRandom } from './sampling.ts';

const texts = RHYMES.map((r) => r.text);

describe('bigram model', () => {
	it('splits words and keeps apostrophes', () => {
		expect(words("All the King's men couldn't.")).toEqual([
			'all',
			'the',
			"king's",
			'men',
			"couldn't"
		]);
	});

	it('counts the pairs the chapter talks about', () => {
		const counts = bigramCounts(texts);
		// "little" is followed by lamb (Mary), dog (Hey Diddle), and star (Twinkle).
		expect(counts.little).toEqual({ lamb: 1, dog: 1, star: 1 });
		// "the" is the most common word, so it has the most followers.
		const followersOfThe = Object.values(counts.the).reduce((a, b) => a + b, 0);
		for (const row of Object.values(counts)) {
			expect(Object.values(row).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(followersOfThe);
		}
	});

	it('never pairs the last word of one rhyme with the first word of the next', () => {
		expect(bigramCounts(texts).go).toBeUndefined();
		expect(bigramPairs(texts).length).toBe(texts.reduce((a, t) => a + words(t).length - 1, 0));
	});

	it('turns counts into probabilities that sum to 1', () => {
		const probs = nextWordProbs(bigramCounts(texts), 'the');
		expect(probs.reduce((a, p) => a + p.p, 0)).toBeCloseTo(1);
		expect(probs[0].p).toBeGreaterThanOrEqual(probs[probs.length - 1].p);
	});

	it('only generates pairs that appeared in the text', () => {
		const counts = bigramCounts(texts);
		const out = generateBigram(counts, 'the', 30, seededRandom(3));
		for (let i = 0; i + 1 < out.length; i++) expect(counts[out[i]][out[i + 1]]).toBeGreaterThan(0);
	});

	it('stops at a word that was never followed by anything', () => {
		const counts = bigramCounts(['a b']);
		expect(generateBigram(counts, 'a', 10, seededRandom(1))).toEqual(['a', 'b']);
	});
});
