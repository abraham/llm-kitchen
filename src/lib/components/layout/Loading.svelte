<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	/** Shows a loading line while recorded data loads, and a readable error if it fails. */
	let { promise, children }: { promise: Promise<T>; children: Snippet<[T]> } = $props();
</script>

{#await promise}
	<p class="status" role="status">Loading recorded data…</p>
{:then value}
	{@render children(value)}
{:catch error}
	<p class="status error" role="alert">
		{error instanceof Error ? error.message : 'Could not load recorded data.'}
	</p>
{/await}

<style>
	.status {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--ink-muted);
		min-height: 6rem;
	}

	.error {
		color: var(--c-loss-ink);
	}
</style>
