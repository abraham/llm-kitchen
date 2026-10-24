<script lang="ts">
	import { untrack } from 'svelte';
	import { findReference, formatAuthors, getCitations } from '#lib/citations.svelte.ts';

	let { id }: { id: string } = $props();

	const ref = $derived(findReference(id));
	// Registered once at init so numbering follows reading order, on the server and the client.
	const n = untrack(() => getCitations()?.number(id));
</script>

<sup class="cite"
	><a
		href="#source-{id}"
		id="cite-{id}"
		aria-label="Source {n}: {formatAuthors(ref.authors)}, {ref.year}">[{n}]</a
	></sup
>

<style>
	.cite {
		font-family: var(--font-sans);
		font-size: 0.7em;
		line-height: 0;
	}

	a {
		text-decoration: none;
		padding-inline: 1px;
	}
</style>
