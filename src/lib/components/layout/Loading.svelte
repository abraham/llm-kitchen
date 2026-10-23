<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { MaybePromise } from '#lib/datasets/use.ts';

	/** Renders recorded data, with a loading line and a readable error when it has to be fetched. */
	let { promise, children }: { promise: MaybePromise<T>; children: Snippet<[T]> } = $props();
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
