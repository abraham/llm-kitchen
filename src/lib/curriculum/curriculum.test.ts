import { describe, expect, it } from 'vitest';
import { CURRICULUM, PARTS, label, next } from './index.ts';

describe('curriculum', () => {
	it('has unique slugs and derives numbers from reading order', () => {
		expect(new Set(CURRICULUM.map((c) => c.slug)).size).toBe(CURRICULUM.length);
		expect(CURRICULUM.map((c) => c.number)).toEqual(CURRICULUM.map((_, i) => i));
		expect(label('attention')).toBe(`Ch ${CURRICULUM.findIndex((c) => c.slug === 'attention')}`);
	});

	it('only builds on earlier chapters', () => {
		for (const c of CURRICULUM) {
			for (const slug of c.buildsOn) {
				expect(
					CURRICULUM.findIndex((x) => x.slug === slug),
					`${c.slug} → ${slug}`
				).toBeLessThan(c.number);
			}
		}
	});

	it('keeps each Part together, in Part order', () => {
		const order = CURRICULUM.map((c) => PARTS.indexOf(c.part));
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('links each chapter to the next', () => {
		expect(next('guessing-game')?.slug).toBe('predicting-by-counting');
		expect(next(CURRICULUM.at(-1)!.slug)).toBeUndefined();
	});
});
