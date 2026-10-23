import { ROWS } from './curriculum.ts';
import { part, type Part } from './parts.ts';

export { PARTS, partLabel, type Part, type PartKey } from './parts.ts';

export type Slug = (typeof ROWS)[number][0];

export interface Chapter {
	/** Position in reading order; derived, never stored. */
	number: number;
	slug: Slug;
	title: string;
	part: Part;
	buildsOn: readonly Slug[];
	description: string;
}

const SLUGS = new Set<string>(ROWS.map((row) => row[0]));

export const CURRICULUM: readonly Chapter[] = ROWS.map(
	([slug, title, partKey, buildsOn, description], number) => {
		for (const s of buildsOn) {
			if (!SLUGS.has(s)) throw new Error(`${slug} builds on unknown chapter ${s}`);
		}
		return {
			number,
			slug,
			title,
			part: part(partKey),
			buildsOn: buildsOn as readonly Slug[],
			description
		};
	}
);

const BY_SLUG = new Map<string, Chapter>(CURRICULUM.map((c) => [c.slug, c]));

export function isSlug(slug: string): slug is Slug {
	return BY_SLUG.has(slug);
}

/** The chapter for a slug that may come from a URL. */
export function findChapter(slug: string): Chapter | undefined {
	return BY_SLUG.get(slug);
}

export function chapter(slug: Slug): Chapter {
	const found = BY_SLUG.get(slug);
	if (!found) throw new Error(`No chapter ${slug}`);
	return found;
}

/** "Ch N": the label for a chapter's number, derived from reading order. */
export function label(slug: Slug): string {
	return `Ch ${chapter(slug).number}`;
}

export function next(slug: Slug): Chapter | undefined {
	return CURRICULUM[chapter(slug).number + 1];
}
