<script lang="ts">
	import type { Snippet } from 'svelte';

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
	<div class="table">{@render children()}</div>
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

	.table {
		max-height: 16rem;
		overflow: auto;
		margin-top: var(--space-1);
	}
</style>
