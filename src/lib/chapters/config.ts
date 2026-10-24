import type { DatasetId } from '#lib/datasets/registry.ts';
import type { ExtraLevel } from '#lib/levels.ts';

/** What a chapter's optional `chapter.ts` exports. */
export interface ChapterConfig {
	/** The datasets its widgets show on first view, loaded with the page. */
	datasets?: readonly DatasetId[];
	/** The levels it has passages for beyond Standard. */
	levels?: readonly ExtraLevel[];
}

const configs = import.meta.glob<ChapterConfig>('./*/chapter.ts', { eager: true });

export function chapterConfig(slug: string): ChapterConfig {
	return configs[`./${slug}/chapter.ts`] ?? {};
}

/**
 * Whether readers can choose a level: once any chapter reads differently at one, and in the
 * end-to-end build (VITE_FIXTURES), whose fixture pages do.
 */
export const LEVEL_CHOICE =
	!!import.meta.env.VITE_FIXTURES ||
	Object.values(configs).some((c) => (c.levels?.length ?? 0) > 0);
