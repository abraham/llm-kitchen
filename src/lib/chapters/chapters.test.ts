import { describe, expect, it } from 'vitest';
import { CURRICULUM, chapterFileName, chapterFiles, writtenChapters } from './index.ts';

describe('chapters', () => {
	it('numbers the curriculum 0..N in order with unique slugs', () => {
		expect(CURRICULUM.map((c) => c.number)).toEqual(CURRICULUM.map((_, i) => i));
		expect(new Set(CURRICULUM.map((c) => c.slug)).size).toBe(CURRICULUM.length);
	});

	it('only builds on earlier chapters', () => {
		for (const chapter of CURRICULUM) {
			for (const n of chapter.buildsOn) expect(n).toBeLessThan(chapter.number);
		}
	});

	it('only has chapter files that match a curriculum entry', () => {
		const expected = new Set(CURRICULUM.map(chapterFileName));
		for (const file of chapterFiles()) expect(expected).toContain(file);
	});

	it('has at least one written chapter', () => {
		expect(writtenChapters().length).toBeGreaterThan(0);
	});
});
