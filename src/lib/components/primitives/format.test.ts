import { describe, expect, it } from 'vitest';
import { describeToken, displayToken, formatPercent } from './format.ts';

describe('token formatting', () => {
	it('makes leading spaces and newlines visible', () => {
		expect(displayToken(' sat')).toBe('·sat');
		expect(displayToken('\n')).toBe('↵');
	});

	it('describes tokens for screen readers', () => {
		expect(describeToken(' sat', 3332)).toBe('"space sat", token 3332');
		expect(describeToken('The')).toBe('"The"');
	});

	it('formats probabilities as percentages', () => {
		expect(formatPercent(0.4)).toBe('40%');
		expect(formatPercent(0.034)).toBe('3.4%');
		expect(formatPercent(0.0001)).toBe('<0.1%');
		expect(formatPercent(0)).toBe('0.0%');
		expect(formatPercent(1 - 0.9)).toBe('10%');
	});
});
