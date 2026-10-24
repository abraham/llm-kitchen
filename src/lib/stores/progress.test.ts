import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '#lib/curriculum/index.ts';
import { parseVisited } from './progress.svelte.ts';

describe('parseVisited', () => {
	const slug = CURRICULUM[0].slug;

	it('keeps chapter slugs', () => {
		expect(parseVisited(JSON.stringify([slug]))).toEqual([slug]);
	});

	it('drops anything else', () => {
		expect(parseVisited(JSON.stringify([slug, 'not-a-chapter', 42, null, { slug }]))).toEqual([
			slug
		]);
		for (const raw of ['{"a":1}', '"attention"', 'not json', null]) {
			expect(parseVisited(raw), String(raw)).toEqual([]);
		}
	});
});
