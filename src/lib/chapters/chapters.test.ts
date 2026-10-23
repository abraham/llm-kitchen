import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, chapter } from '#lib/curriculum/index.ts';
import { GLOSSARY } from '#lib/glossary.ts';
import { chapterFolders } from './index.ts';

describe('chapters', () => {
	it('has one folder per curriculum entry, named by slug', () => {
		expect(chapterFolders().sort()).toEqual(CURRICULUM.map((c) => c.slug).sort());
	});

	it('points each glossary term at a chapter that mentions it', () => {
		for (const [id, entry] of Object.entries(GLOSSARY)) {
			const { slug } = chapter(entry.chapter);
			const text = readFileSync(new URL(`./${slug}/chapter.svx`, import.meta.url), 'utf8');
			const name = entry.term.replace(/\s*\(.*\)$/, '').toLowerCase();
			const mentioned = text.includes(`term="${id}"`) || text.toLowerCase().includes(name);
			expect(mentioned, `${id} in ${slug}`).toBe(true);
		}
	});
});
