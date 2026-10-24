<script lang="ts">
	import { untrack } from 'svelte';
	import {
		findReference,
		formatAuthors,
		getCitations,
		sourceAnchor
	} from '#lib/citations.svelte.ts';
	import { getLevels, type Level } from '#lib/levels.ts';

	let { id }: { id: string } = $props();

	const ref = $derived(findReference(id));
	const citations = getCitations();
	// Registered once at init so numbering follows reading order, on the server and the client.
	const numbers = untrack(() => citations?.number(id, getLevels()));
	// One link per level where numbering differs by level; global.css shows the current one.
	const links: { level?: Level; n?: number }[] = citations?.leveled
		? (numbers ?? [])
		: [{ n: numbers?.find((l) => l.level === 'standard')?.n }];
</script>

<sup class="cite" id="cite-{id}"
	>{#each links as { level, n } (level)}<a
			href="#{sourceAnchor(id, level)}"
			data-levels={level}
			aria-label="Source {n}: {formatAuthors(ref.authors)}, {ref.year}">[{n}]</a
		>{/each}</sup
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
