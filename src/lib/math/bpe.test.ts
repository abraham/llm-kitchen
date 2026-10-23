import { describe, expect, it } from 'vitest';
import { END, SENNRICH_CORPUS, learnBpe } from './bpe.ts';

describe('learnBpe', () => {
	const steps = learnBpe(SENNRICH_CORPUS, 10);
	const merges = steps.slice(1).map((s) => s.merged!.join(' '));

	it('learns the same first merges as the reference implementation in Sennrich et al.', () => {
		expect(merges.slice(0, 4)).toEqual(['e s', 'es t', `est ${END}`, 'l o']);
		expect(steps[1].pairCount).toBe(9);
	});

	it('starts from characters plus an end-of-word marker', () => {
		expect(steps[0].words[0].symbols).toEqual(['l', 'o', 'w', END]);
		expect(steps[0].totalSymbols).toBe(5 * 4 + 2 * 6 + 6 * 7 + 3 * 7);
	});

	it('grows the vocabulary by one and never increases the symbol count', () => {
		for (let i = 1; i < steps.length; i++) {
			expect(steps[i].vocabulary.length).toBe(steps[i - 1].vocabulary.length + 1);
			expect(steps[i].totalSymbols).toBeLessThan(steps[i - 1].totalSymbols);
		}
	});

	it('ends with frequent words as single symbols', () => {
		const final = steps[steps.length - 1].words.map((w) => w.symbols.join(' '));
		expect(final).toContain(`newest${END}`);
		expect(final).toContain(`low${END}`);
	});
});
