import { describe, expect, it } from 'vitest';
import { applyTemperature, sampleIndex, seededRandom, softmax, topK } from './sampling.ts';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('softmax', () => {
	it('sums to 1 and preserves order', () => {
		const p = softmax([2, 1, 0]);
		expect(sum(p)).toBeCloseTo(1);
		expect(p[0]).toBeGreaterThan(p[1]);
		expect(p[1]).toBeGreaterThan(p[2]);
	});

	it('matches a hand-computed value', () => {
		// e^1 / (e^1 + e^0) = 0.7310585786
		expect(softmax([1, 0])[0]).toBeCloseTo(0.7310585786, 9);
	});

	it('is stable for large logits', () => {
		expect(softmax([1000, 1000])).toEqual([0.5, 0.5]);
	});

	it('puts all mass on the max at temperature 0', () => {
		expect(softmax([0.1, 3, 2], 0)).toEqual([0, 1, 0]);
	});
});

describe('applyTemperature', () => {
	const probs = [0.6, 0.3, 0.1];

	it('leaves probabilities unchanged at T = 1', () => {
		applyTemperature(probs, 1).forEach((p, i) => expect(p).toBeCloseTo(probs[i]));
	});

	it('sharpens below 1 and flattens above 1', () => {
		expect(applyTemperature(probs, 0.5)[0]).toBeGreaterThan(0.6);
		expect(applyTemperature(probs, 2)[0]).toBeLessThan(0.6);
		expect(sum(applyTemperature(probs, 2))).toBeCloseTo(1);
	});

	it('is p^(1/T) normalized', () => {
		const t = 0.5;
		const raw = probs.map((p) => p ** (1 / t));
		applyTemperature(probs, t).forEach((p, i) => expect(p).toBeCloseTo(raw[i] / sum(raw)));
	});

	it('keeps zero-probability items at zero', () => {
		expect(applyTemperature([0.5, 0.5, 0], 2)[2]).toBe(0);
	});
});

describe('topK', () => {
	it('keeps the k most likely items in their original order and renormalizes', () => {
		const items = [
			{ item: 'a', p: 0.1 },
			{ item: 'b', p: 0.5 },
			{ item: 'c', p: 0.4 }
		];
		const kept = topK(items, 2);
		expect(kept.map((w) => w.item)).toEqual(['b', 'c']);
		expect(kept[0].p).toBeCloseTo(0.5 / 0.9);
	});
});

describe('sampleIndex', () => {
	it('maps the unit interval onto cumulative probabilities', () => {
		expect(sampleIndex([0.2, 0.5, 0.3], 0)).toBe(0);
		expect(sampleIndex([0.2, 0.5, 0.3], 0.19)).toBe(0);
		expect(sampleIndex([0.2, 0.5, 0.3], 0.2)).toBe(1);
		expect(sampleIndex([0.2, 0.5, 0.3], 0.71)).toBe(2);
		expect(sampleIndex([0.2, 0.5, 0.3], 0.9999)).toBe(2);
	});

	it('samples close to the true frequencies', () => {
		const rand = seededRandom(42);
		const counts = [0, 0, 0];
		for (let i = 0; i < 20000; i++) counts[sampleIndex([0.2, 0.5, 0.3], rand())]++;
		expect(counts[1] / 20000).toBeCloseTo(0.5, 1);
	});
});

describe('seededRandom', () => {
	it('is deterministic for a seed', () => {
		const a = seededRandom(7);
		const b = seededRandom(7);
		expect([a(), a(), a()]).toEqual([b(), b(), b()]);
	});
});
