<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { chapter, label, next, partLabel, type Chapter } from '#lib/curriculum/index.ts';
	import { LEVEL_NAMES, LEVELS, type ExtraLevel } from '#lib/levels.ts';
	import { absoluteUrl, chapterEditUrl, chapterHeading } from '#lib/site.ts';
	import { scrollableEquations } from '../ui/scrollable.ts';
	import At from './At.svelte';
	import CitationScope from './CitationScope.svelte';
	import IngredientsBox from './IngredientsBox.svelte';
	import ProgressNav from './ProgressNav.svelte';

	let {
		meta,
		levels = [],
		levelChoice = false,
		children
	}: {
		meta: Chapter;
		/** The levels the chapter has passages for beyond Standard (its chapter.ts `levels`). */
		levels?: readonly ExtraLevel[];
		/** Whether readers can choose a level, so a note says when this chapter has none of theirs. */
		levelChoice?: boolean;
		children: Snippet;
	} = $props();

	const ingredients = $derived(meta.buildsOn.map(chapter));
	const after = $derived(next(meta.slug));
	const unwritten = $derived(
		levelChoice ? LEVELS.filter((l) => l !== 'standard' && !levels.includes(l)) : []
	);

	// Checked after hydration, so the prerendered page never shows a button that does nothing.
	let canShare = $state(false);
	onMount(() => {
		canShare = typeof navigator.share === 'function';
	});

	async function share() {
		try {
			await navigator.share({
				title: chapterHeading(meta),
				url: absoluteUrl(resolve('/[chapter]', { chapter: meta.slug }))
			});
		} catch (error) {
			// Closing the share sheet rejects with AbortError.
			if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
		}
	}
</script>

<div class="chapter-layout">
	<aside class="rail">
		<details class="rail-toggle">
			<summary>Chapters</summary>
			<ProgressNav current={meta.slug} />
		</details>
		<div class="rail-static">
			<ProgressNav current={meta.slug} />
		</div>
	</aside>

	<div class="column">
		<main id="content" class="prose" {@attach scrollableEquations}>
			<header>
				<p class="label">{partLabel(meta.part, ' · ')}</p>
				<h1><span class="num">{label(meta.slug)}.</span> {meta.title}</h1>
				{#each unwritten as level (level)}
					<At levels={level}>
						<p class="label">
							This chapter has no {LEVEL_NAMES[level]} passages yet, so it reads like Standard.
						</p>
					</At>
				{/each}
			</header>

			<IngredientsBox
				chapters={ingredients}
				empty={meta.number === 0 ? undefined : 'Everything from the earlier chapters.'}
			/>

			{#key meta.slug}
				<CitationScope {levels}>
					{@render children()}
				</CitationScope>
			{/key}

			<footer class="next">
				{#if after}
					<p class="label">Up next</p>
					<a href={resolve('/[chapter]', { chapter: after.slug })}>
						{label(after.slug)}. {after.title} →
					</a>
				{:else}
					<p class="label">More chapters are on the way.</p>
					<a href={resolve('/')}>Back to the menu</a>
				{/if}
				<p class="edit">
					Spotted a mistake?
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={chapterEditUrl(meta.slug)} rel="noopener noreferrer" target="_blank"
						>Edit this chapter on GitHub</a
					>
					{#if canShare}
						· <button type="button" class="share" onclick={share}>Share this chapter</button>
					{/if}
				</p>
			</footer>
		</main>
	</div>
</div>

<style>
	.chapter-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	.rail {
		padding: var(--space-3) var(--space-4) 0;
		font-family: var(--font-sans);
	}

	.rail-static {
		display: none;
	}

	.rail-toggle summary {
		cursor: pointer;
		font-size: 0.875rem;
	}

	main {
		width: 100%;
		padding-block: var(--space-8) var(--space-12);
	}

	header .label {
		margin: 0 0 var(--space-2);
	}

	.num {
		color: var(--c-token-ink);
		font-family: var(--font-mono);
		font-size: 0.75em;
		font-weight: 500;
	}

	.next {
		margin-top: var(--space-12);
		padding-top: var(--space-4);
		border-top: 1px solid var(--rule);
	}

	.next .label {
		margin: 0;
	}

	.next > a {
		font-size: 1.25rem;
	}

	.next .edit {
		margin: var(--space-6) 0 0;
		color: var(--ink-muted);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	/* A button, since it opens the share sheet, styled like the link beside it. */
	.share {
		padding: 0;
		border: 0;
		background: none;
		color: var(--c-prob-ink);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.15em;
		cursor: pointer;
	}

	.share:hover:not(:disabled) {
		background: none;
		text-decoration-thickness: 2px;
	}

	@media (min-width: 72rem) {
		.chapter-layout {
			grid-template-columns: 15rem minmax(0, 1fr);
		}

		.rail-toggle {
			display: none;
		}

		.rail-static {
			display: block;
			position: sticky;
			top: var(--app-bar-height);
			max-height: calc(100vh - var(--app-bar-height));
			overflow-y: auto;
			padding-block: var(--space-6);
		}
	}
</style>
