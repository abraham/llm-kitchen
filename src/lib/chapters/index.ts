import type { Component } from 'svelte';
import { CURRICULUM, chapterFileName, findChapter, type ChapterMeta } from './meta.ts';

export * from './meta.ts';

const modules = import.meta.glob<{ default: Component }>('./*.svx');

/** File names of every chapter that has been written so far. */
export function chapterFiles(): string[] {
	return Object.keys(modules).map((path) => path.slice(2));
}

/** Curriculum entries that have a chapter file, in reading order. */
export function writtenChapters(): ChapterMeta[] {
	const files = new Set(chapterFiles());
	return CURRICULUM.filter((chapter) => files.has(chapterFileName(chapter)));
}

export async function loadChapter(
	slug: string
): Promise<{ meta: ChapterMeta; component: Component } | undefined> {
	const meta = findChapter(slug);
	const load = meta && modules[`./${chapterFileName(meta)}`];
	if (!meta || !load) return undefined;
	return { meta, component: (await load()).default };
}
