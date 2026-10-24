import type { Component } from 'svelte';
import { findChapter, type Chapter } from '#lib/curriculum/index.ts';
import type { DatasetId } from '#lib/datasets/registry.ts';
import type { ExtraLevel } from '#lib/levels.ts';
import { chapterConfig } from './config.ts';

const modules = import.meta.glob<{ default: Component }>('./*/chapter.svx');

/** Slugs of every chapter folder. */
export function chapterFolders(): string[] {
	return Object.keys(modules).map((path) => path.split('/')[1]);
}

/** The datasets a chapter's widgets show on first view, listed in its `chapter.ts`. */
export function chapterDatasets(slug: string): readonly DatasetId[] {
	return chapterConfig(slug).datasets ?? [];
}

/** The levels a chapter has passages for beyond Standard, listed in its `chapter.ts`. */
export function chapterLevels(slug: string): readonly ExtraLevel[] {
	return chapterConfig(slug).levels ?? [];
}

export async function loadChapter(
	slug: string
): Promise<{ meta: Chapter; component: Component } | undefined> {
	const meta = findChapter(slug);
	const load = meta && modules[`./${meta.slug}/chapter.svx`];
	if (!meta || !load) return undefined;
	return { meta, component: (await load()).default };
}
