<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scrollable } from './scrollable.ts';

	let {
		label,
		maxHeight,
		framed = false,
		children
	}: {
		label: string;
		/** A CSS length; without one the box only scrolls sideways when its content is too wide. */
		maxHeight?: string;
		/** A tinted, bordered panel, for a reply or log rather than a wide table. */
		framed?: boolean;
		children: Snippet;
	} = $props();
</script>

<div
	class="scroll-box"
	class:framed
	role="region"
	aria-label={label}
	style:max-height={maxHeight}
	{@attach scrollable}
>
	{@render children()}
</div>

<style>
	.scroll-box {
		/* Keeps visually hidden content inside the box, so it can't widen the page. */
		position: relative;
		overflow: auto;
	}

	.framed {
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
</style>
