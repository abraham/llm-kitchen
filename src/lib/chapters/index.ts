import type { Component } from 'svelte';
import { findChapter, type Chapter } from '#lib/curriculum/index.ts';
import type { DatasetId } from '#lib/datasets/registry.ts';

const modules = import.meta.glob<{ default: Component }>('./*/chapter.svx');
const configs = import.meta.glob<{ datasets: readonly DatasetId[] }>('./*/chapter.ts', {
	eager: true
});

/** Slugs of every chapter folder. */
export function chapterFolders(): string[] {
	return Object.keys(modules).map((path) => path.split('/')[1]);
}

/** The datasets a chapter's widgets show on first view, listed in its `chapter.ts`. */
export function chapterDatasets(slug: string): readonly DatasetId[] {
	return configs[`./${slug}/chapter.ts`]?.datasets ?? [];
}

export async function loadChapter(
	slug: string
): Promise<{ meta: Chapter; component: Component } | undefined> {
	const meta = findChapter(slug);
	const load = meta && modules[`./${meta.slug}/chapter.svx`];
	if (!meta || !load) return undefined;
	return { meta, component: (await load()).default };
}
