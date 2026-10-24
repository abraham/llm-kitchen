import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, chapter } from '#lib/curriculum/index.ts';
import { GLOSSARY } from '#lib/glossary.ts';
import { parseLevels, type ExtraLevel } from '#lib/levels.ts';
import { chapterFolders, chapterLevels } from './index.ts';

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
			// A level differs where a passage shows at it but not at Standard, or the other way round.
			const differs = new Set<ExtraLevel>();
			for (const [tag] of source(slug).matchAll(/<At\b[^>]*>/g)) {
				const raw = tag.match(/\slevels="([^"]*)"/)?.[1];
				expect(raw, `${slug}: ${tag} names its levels`).toBeDefined();
				const levels = parseLevels(raw!);
				for (const level of ['simple', 'deep'] as const) {
					if (levels.includes(level) !== levels.includes('standard')) differs.add(level);
				}
			}
			expect([...chapterLevels(slug)].sort(), slug).toEqual([...differs].sort());
		}
	});
});
