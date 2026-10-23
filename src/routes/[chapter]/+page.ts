import { error } from '@sveltejs/kit';
import { loadChapter, writtenChapters } from '#lib/chapters/index.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () =>
	writtenChapters().map((chapter) => ({ chapter: chapter.slug }));

export const load: PageLoad = async ({ params }) => {
	const chapter = await loadChapter(params.chapter);
	if (!chapter) error(404, 'Chapter not found');
	return chapter;
};
