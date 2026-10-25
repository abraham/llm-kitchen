<script lang="ts">
	import type { Snippet } from 'svelte';
	import ScrollBox from './ScrollBox.svelte';

	let {
		summary = 'The numbers',
		children
	}: {
		summary?: string;
		/** A `table.data` with what the figure draws. */
		children: Snippet;
	} = $props();
</script>

<details class="figure-data">
	<summary>{summary}</summary>
	<ScrollBox label={summary} maxHeight="16rem">{@render children()}</ScrollBox>
</details>

<style>
	.figure-data {
		margin: var(--space-2) 0 0;
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	summary {
		cursor: pointer;
		color: var(--ink-muted);
	}

	.figure-data[open] summary {
		margin-bottom: var(--space-1);
	}
</style>
