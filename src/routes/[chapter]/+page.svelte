<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import ChapterLayout from '#lib/components/layout/ChapterLayout.svelte';
	import PageMeta from '#lib/components/layout/PageMeta.svelte';
	import { provideDatasets } from '#lib/datasets/use.ts';
	import { chapterHeading, chapterImageAlt, SITE_NAME } from '#lib/site.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const Chapter = $derived(data.component);
	provideDatasets(() => data.datasets);

	$effect(() => {
		const slug = data.meta.slug;
		untrack(() => progress.visit(slug));
	});
</script>

<PageMeta
	title="{chapterHeading(data.meta)} · {SITE_NAME}"
	shareTitle={chapterHeading(data.meta)}
	description={data.meta.description}
	path={resolve('/[chapter]', { chapter: data.meta.slug })}
	image={data.meta.slug}
	imageAlt={chapterImageAlt(data.meta)}
	type="article"
/>

<ChapterLayout meta={data.meta}>
	<Chapter />
</ChapterLayout>
