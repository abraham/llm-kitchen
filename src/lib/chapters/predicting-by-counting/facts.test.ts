import { describe, expect, it } from 'vitest';
import { RHYMES } from '#lib/data/rhymes.ts';
import { bigramCounts, words } from '#lib/math/bigram.ts';

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
});
