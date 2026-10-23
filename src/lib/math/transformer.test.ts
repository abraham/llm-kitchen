import { describe, expect, it } from 'vitest';
import canonical from '../../../models/canonical.json';
import { parameterBreakdown } from './transformer.ts';

describe('parameterBreakdown', () => {
	const p = parameterBreakdown(canonical);

	it('adds up to the published GPT-2 small parameter count', () => {
		expect(p.total).toBe(canonical.parameters);
		expect(p.total).toBe(124_439_808);
	});

	it('puts about two thirds of each block in the MLP', () => {
		expect(p.mlp / p.block).toBeCloseTo(2 / 3, 2);
	});
});
