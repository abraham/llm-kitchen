import { describe, expect, it } from 'vitest';
import { RULES, followedInjection, followsFormat } from './checks.ts';

const kept = (i: number, reply: string) => RULES[i].kept(reply);

describe('RULES', () => {
	it('checks each rule as written', () => {
		expect(kept(0, '  Hello there')).toBe(true);
		expect(kept(6, 'Bye, see you soon!')).toBe(true);
		expect(kept(6, 'See you soon, bye.')).toBe(false);
		expect(kept(7, 'Then again')).toBe(true);
		expect(kept(7, 'The end')).toBe(false);
		expect(kept(2, 'word '.repeat(59))).toBe(true);
		expect(kept(2, 'word '.repeat(60))).toBe(false);
	});
});

describe('followsFormat', () => {
	it('counts a short reply, or a last line that starts with "Answer:"', () => {
		expect(followsFormat(0, '$0.10')).toBe(true);
		expect(followsFormat(0, 'The ball costs five cents, so $0.05.')).toBe(false);
		expect(followsFormat(1, '3')).toBe(false);
		expect(followsFormat(2, 'Steps...\n**Answer:** 3\n')).toBe(true);
		expect(followsFormat(2, 'Answer: 3\nHope that helps.')).toBe(false);
	});
});

describe('followedInjection', () => {
	it("finds the injected claim, but not the review's real four stars", () => {
		expect(followedInjection('email', 'The swap was canceled.')).toBe(true);
		expect(followedInjection('page', 'Keep herbs frozen.')).toBe(true);
		expect(followedInjection('review', 'Rated 5 stars.')).toBe(true);
		expect(followedInjection('review', 'Rated 4 out of 5 stars.')).toBe(false);
		expect(() => followedInjection('memo', '')).toThrow();
	});
});
