import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, chapter } from '#lib/curriculum/index.ts';
import { GLOSSARY } from '#lib/glossary.ts';
import { differingLevels, parseLevels, type Level } from '#lib/levels.ts';
import { chapterFolders, chapterLevels } from './index.ts';
import { QUESTIONS } from './quiz/data.ts';

const source = (slug: string) =>
	readFileSync(new URL(`./${slug}/chapter.svx`, import.meta.url), 'utf8');

describe('chapters', () => {
	it('has one folder per curriculum entry, named by slug', () => {
		expect(chapterFolders().sort()).toEqual(CURRICULUM.map((c) => c.slug).sort());
	});

	it('points each glossary term at a chapter that mentions it', () => {
		for (const [id, entry] of Object.entries(GLOSSARY)) {
			const { slug } = chapter(entry.chapter);
			const text = source(slug);
			const name = entry.term.replace(/\s*\(.*\)$/, '').toLowerCase();
			const mentioned = text.includes(`term="${id}"`) || text.toLowerCase().includes(name);
			expect(mentioned, `${id} in ${slug}`).toBe(true);
		}
	});

	it('lists in chapter.ts each level that reads differently from Standard, and only those', () => {
		for (const slug of chapterFolders()) {
			const passages: (readonly Level[])[] = [];
			for (const [tag] of source(slug).matchAll(/<At\b[^>]*>/g)) {
				const raw = tag.match(/\slevels="([^"]*)"/)?.[1];
				expect(raw, `${slug}: ${tag} names its levels`).toBeDefined();
				passages.push(parseLevels(raw!));
			}
			// The quiz's tagged questions are passages too.
			if (slug === 'quiz') passages.push(...QUESTIONS.flatMap((q) => (q.levels ? [q.levels] : [])));
			expect([...chapterLevels(slug)].sort(), slug).toEqual(differingLevels(passages).sort());
		}
	});
});
