<script lang="ts">
	import { untrack } from 'svelte';
	import ChapterLayout from '#lib/components/layout/ChapterLayout.svelte';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const Chapter = $derived(data.component);

	$effect(() => {
		const slug = data.meta.slug;
		untrack(() => progress.visit(slug));
	});
</script>

<svelte:head>
	<title>Ch {data.meta.number}. {data.meta.title} · llm-kitchen</title>
	<meta
		name="description"
		content="Chapter {data.meta
			.number} of llm-kitchen, an interactive guide to how large language models work: {data.meta
			.title}."
	/>
</svelte:head>

<ChapterLayout meta={data.meta} next={data.next}>
	<Chapter />
</ChapterLayout>
