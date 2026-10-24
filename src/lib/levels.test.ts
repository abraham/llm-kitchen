import { describe, expect, it } from 'vitest';
import { Citations, sourceAnchor } from './citations.svelte.ts';
import { parseLevel, parseLevels } from './levels.ts';

describe('parseLevel', () => {
	it('keeps simple and deep, and ignores anything else in storage', () => {
		expect(parseLevel('simple')).toBe('simple');
		expect(parseLevel('deep')).toBe('deep');
		for (const raw of ['standard', 'Deep', 'in-depth', '', null, undefined]) {
			expect(parseLevel(raw), String(raw)).toBeNull();
		}
	});
});

describe('parseLevels', () => {
	it('reads a list in reading order', () => {
		expect(parseLevels('deep  standard')).toEqual(['standard', 'deep']);
		expect(parseLevels('simple')).toEqual(['simple']);
	});

	it('rejects an empty list or an unknown level', () => {
		for (const raw of ['', '  ', 'easy', 'simple expert']) {
			expect(() => parseLevels(raw), raw).toThrow(/needs one or more of/);
		}
	});
});

describe('Citations', () => {
	const numbers = (list: { level: string; n: number }[]) => list.map((l) => `${l.level} ${l.n}`);

	it('numbers every level alike when the chapter has no other levels', () => {
		const citations = new Citations();
		expect(citations.leveled).toBe(false);
		expect(numbers(citations.number('shannon1948'))).toEqual(['simple 1', 'standard 1', 'deep 1']);
		expect(numbers(citations.number('shannon1951'))).toEqual(['simple 2', 'standard 2', 'deep 2']);
		expect(numbers(citations.number('shannon1948'))).toEqual(['simple 1', 'standard 1', 'deep 1']);
		expect(citations.ids.standard).toEqual(['shannon1948', 'shannon1951']);
	});

	it('numbers each level separately, counting only what that level shows', () => {
		const citations = new Citations(['simple', 'deep']);
		expect(citations.leveled).toBe(true);
		citations.number('shannon1948');
		expect(numbers(citations.number('radford2019', ['simple']))).toEqual(['simple 2']);
		expect(numbers(citations.number('shannon1951', ['standard', 'deep']))).toEqual([
			'standard 2',
			'deep 2'
		]);
		expect(numbers(citations.number('shannon1951'))).toEqual(['simple 3', 'standard 2', 'deep 2']);
		expect(citations.ids).toEqual({
			simple: ['shannon1948', 'radford2019', 'shannon1951'],
			standard: ['shannon1948', 'shannon1951'],
			deep: ['shannon1948', 'shannon1951']
		});
	});

	it('rejects unknown sources', () => {
		expect(() => new Citations().number('nobody2099')).toThrow(/Unknown citation id/);
	});
});

describe('sourceAnchor', () => {
	it("keeps Standard's anchors plain and prefixes the other levels'", () => {
		expect(sourceAnchor('shannon1948')).toBe('source-shannon1948');
		expect(sourceAnchor('shannon1948', 'standard')).toBe('source-shannon1948');
		expect(sourceAnchor('shannon1948', 'deep')).toBe('source-deep-shannon1948');
	});
});
