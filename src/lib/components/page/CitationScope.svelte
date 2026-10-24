<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Citations, setCitations } from '#lib/citations.svelte.ts';
	import type { ExtraLevel } from '#lib/levels.ts';
	import Sources from './Sources.svelte';

	let {
		levels = [],
		children
	}: {
		/** The levels the chapter has passages for beyond Standard (its chapter.ts `levels`). */
		levels?: readonly ExtraLevel[];
		children: Snippet;
	} = $props();

	// A new scope (ChapterLayout's {#key}) starts for each chapter, so its levels are read once.
	const citations = new Citations(untrack(() => levels));
	setCitations(citations);
</script>

{@render children()}
<Sources {citations} />
