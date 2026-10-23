<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const Chapter = $derived(data.component);
</script>

<svelte:head>
	<title>Ch {data.meta.number}. {data.meta.title} · llm-kitchen</title>
</svelte:head>

<main>
	<p>Part {data.meta.part.number}: {data.meta.part.title}</p>
	<h1>Ch {data.meta.number}. {data.meta.title}</h1>
	<Chapter />
</main>
