import { error } from '@sveltejs/kit';
import { chapterDatasets, loadChapter } from '#lib/chapters/index.ts';
import { CURRICULUM } from '#lib/curriculum/index.ts';
import { fetchDataset } from '#lib/datasets/load.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => CURRICULUM.map((c) => ({ chapter: c.slug }));

export const load: PageLoad = async ({ params, fetch }) => {
	const chapter = await loadChapter(params.chapter);
	if (!chapter) error(404, 'Chapter not found');
	// Fetched here so the prerendered page shows the data; the browser replays these responses.
	const datasets = Object.fromEntries(
		await Promise.all(
			chapterDatasets(chapter.meta.slug).map(async (id) => [id, await fetchDataset(id, fetch)])
		)
	);
	return { ...chapter, datasets };
};
