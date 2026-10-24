<script lang="ts">
	import CitationScope from '#lib/components/page/CitationScope.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const Fixture = $derived(data.component);
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<main id="content" class="prose">
	<h1>{data.title}</h1>
	{#key data.component}
		<CitationScope levels={data.levels}>
			<Fixture />
		</CitationScope>
	{/key}
</main>

<style>
	main {
		padding-block: var(--space-8) var(--space-12);
	}
</style>
