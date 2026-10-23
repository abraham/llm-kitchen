import { describe, expect, it } from 'vitest';
import canonical from '../../../../models/canonical.json';

describe('the context problem', () => {
	it('"about 2.5 billion possible pairs and about 127 trillion possible triples"', () => {
		expect(canonical.vocabularySize ** 2 / 1e9).toBeCloseTo(2.5, 1);
		expect(Math.round(canonical.vocabularySize ** 3 / 1e12)).toBe(127);
	});

	it('"GPT-2 can look at up to 1,024 tokens"', () => {
		expect(canonical.contextLength).toBe(1024);
	});
});
