import { partLabel, type ChapterMeta } from './chapters/meta.ts';

/** The site's name wherever a person reads it. The repo, package, and storage keys keep `llm-kitchen`. */
export const SITE_NAME = 'LLM Kitchen';

export const SITE_TAGLINE = 'How a large language model works, one idea at a time.';

export const SITE_DESCRIPTION =
	'An interactive guide to how large language models work, from guessing the next word to agents, image models, and prompting.';

/** Origin for canonical and Open Graph URLs. Switch to the custom domain once it is live. */
export const SITE_ORIGIN = 'https://llm-kitchen-aaa2b.web.app';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Name of the menu's social image; chapters use their slug. */
export const MENU_IMAGE = 'menu';

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).href;
}

export function ogImagePath(name: string): string {
	return `/og/${name}.png`;
}

export function chapterHeading(chapter: ChapterMeta): string {
	return `Ch ${chapter.number}. ${chapter.title}`;
}

export function chapterImageAlt(chapter: ChapterMeta): string {
	return `${SITE_NAME}, ${partLabel(chapter.part)}. ${chapterHeading(chapter)}`;
}
