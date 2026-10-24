<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { getLevels, parseLevels, setLevels } from '#lib/levels.ts';

	let {
		levels,
		inline = false,
		children
	}: {
		/** One or more of simple, standard, deep. */
		levels: string;
		/** A <span> for a phrase inside a sentence, instead of a <div>. */
		inline?: boolean;
		children: Snippet;
	} = $props();

	// Every level is in the HTML; global.css hides the ones that aren't current. Passages are written
	// with fixed levels, so they're read once and shared with Cite through context.
	const outer = getLevels();
	const shown = untrack(() => parseLevels(levels)).filter((l) => outer.includes(l));
	setLevels(shown);
</script>

{#if inline}
	<span data-levels={shown.join(' ')}>{@render children()}</span>
{:else}
	<div data-levels={shown.join(' ')}>{@render children()}</div>
{/if}
