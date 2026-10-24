import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import { bigramCounts, nextWordProbs, words } from '#lib/math/bigram.ts';
import canonical from '../../../../models/canonical.json';

describe('predicting by counting', () => {
	const counts = bigramCounts(RHYMES.map((r) => r.text));

	it('"little was followed by lamb, dog, and star once each"', () => {
		expect(counts.little).toEqual({ lamb: 1, dog: 1, star: 1 });
	});

	it('the wandering example only uses pairs from the rhymes', () => {
		const example = words('the cow jumped over the clock struck one, the lamb was sure to go');
		for (let i = 0; i + 1 < example.length; i++) {
			expect(
				counts[example[i]]?.[example[i + 1]],
				`${example[i]} → ${example[i + 1]}`
			).toBeGreaterThan(0);
		}
	});

	it('"six nursery rhymes"', () => {
		expect(RHYMES).toHaveLength(6);
	});

	it('"the" is followed by words from the cow, mouse, and lamb rhymes', () => {
		expect(Object.keys(counts.the)).toEqual(expect.arrayContaining(['cow', 'mouse', 'lamb']));
	});

	it('In depth: count over count gives P(lamb | little) = 1/3', () => {
		const total = Object.values(counts.little).reduce((a, b) => a + b, 0);
		expect(total).toBe(3);
		expect(nextWordProbs(counts, 'little').find((w) => w.word === 'lamb')?.p).toBeCloseTo(
			1 / 3,
			12
		);
	});

	it('In depth: add-one smoothing still gives every word after "little" chances that add up to 1', () => {
		const vocabulary = [...new Set(RHYMES.flatMap((r) => words(r.text)))];
		const total = Object.values(counts.little).reduce((a, b) => a + b, 0);
		const smoothed = vocabulary.map(
			(w) => ((counts.little[w] ?? 0) + 1) / (total + vocabulary.length)
		);
		expect(smoothed.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
		expect(Math.min(...smoothed)).toBeGreaterThan(0);
	});

	it('In depth: every pair of GPT-2 tokens is "about 2.5 billion", every triple "about 127 trillion"', () => {
		const v = canonical.vocabularySize;
		expect(Math.round(v ** 2 / 1e8) / 10).toBe(2.5);
		expect(Math.round(v ** 3 / 1e12)).toBe(127);
	});
});
