import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import type { ExtraLevel } from '#lib/levels.ts';
import type { EntryGenerator, PageLoad } from './$types';

interface Fixture {
	default: Component;
	title: string;
	levels?: readonly ExtraLevel[];
}

// Test-only pages for the end-to-end build (VITE_FIXTURES); other builds have none.
const modules: Record<string, () => Promise<Fixture>> = import.meta.env.VITE_FIXTURES
	? import.meta.glob<Fixture>('/tests/e2e/fixtures/*.svx')
	: {};
const fixtures = new Map(
	Object.entries(modules).map(([path, load]) => [path.replace(/^.*\/|\.svx$/g, ''), load])
);

// 'auto' rather than the layout's true: without fixtures, there's nothing to prerender here.
export const prerender = 'auto';

export const entries: EntryGenerator = () => [...fixtures.keys()].map((fixture) => ({ fixture }));

export const load: PageLoad = async ({ params }) => {
	const fixture = await fixtures.get(params.fixture)?.();
	if (!fixture) error(404, 'Not found');
	return { component: fixture.default, title: fixture.title, levels: fixture.levels ?? [] };
};
