<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { chapterByNumber, writtenChapters } from '#lib/chapters/index.ts';
	import { GLOSSARY, type GlossaryId } from '#lib/glossary.ts';

	let { term, children }: { term: GlossaryId; children: Snippet } = $props();

	const entry = $derived(GLOSSARY[term]);
	const chapter = $derived(chapterByNumber(entry.chapter));
	const linkable = $derived(writtenChapters().some((c) => c.slug === chapter.slug));
	const id = $props.id();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();

	function onwindowkeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') open = false;
	}

	function onwindowclick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onkeydown={onwindowkeydown} onclick={onwindowclick} />

<span class="term" bind:this={root}>
	<button
		type="button"
		class="trigger"
		aria-expanded={open}
		aria-controls={id}
		onclick={() => (open = !open)}>{@render children()}</button
	><span class="popover" {id} role="note" hidden={!open}>
		<strong>{entry.term}</strong>: {entry.definition}
		{#if linkable}
			<a href={resolve('/[chapter]', { chapter: chapter.slug })}>Ch {chapter.number}</a>
		{:else}
			<span class="label">Ch {chapter.number}</span>
		{/if}
	</span>
</span>

<style>
	.term {
		position: relative;
	}

	.trigger {
		all: unset;
		cursor: help;
		border-bottom: 1px dotted currentColor;
	}

	.trigger:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.popover {
		position: absolute;
		z-index: 10;
		top: calc(100% + var(--space-1));
		left: 0;
		width: max-content;
		max-width: min(20rem, 80vw);
		padding: var(--space-2) var(--space-3);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.popover[hidden] {
		display: none;
	}
</style>
