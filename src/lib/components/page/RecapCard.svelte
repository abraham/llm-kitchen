<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title = 'Recap', children }: { title?: string; children: Snippet } = $props();

	const id = $props.id();
</script>

<section class="recipe" aria-labelledby={id}>
	<p class="label">Recipe card</p>
	<h2 {id}>{title}</h2>
	{@render children()}
</section>

<style>
	.recipe {
		margin-block: var(--space-12);
		padding: var(--space-4) var(--space-6);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		box-shadow: 0 1px 0 var(--rule);
	}

	.label {
		margin: 0;
		text-transform: uppercase;
		font-weight: 600;
	}

	h2 {
		margin: 0 0 var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 2px solid var(--c-loss);
	}

	.recipe :global(ul) {
		padding-left: var(--space-6);
	}
</style>
