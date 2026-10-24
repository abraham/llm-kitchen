<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { chapter, label, next, partLabel, type Chapter } from '#lib/curriculum/index.ts';
	import CitationScope from './CitationScope.svelte';
	import IngredientsBox from './IngredientsBox.svelte';
	import ProgressNav from './ProgressNav.svelte';

	let { meta, children }: { meta: Chapter; children: Snippet } = $props();

	const ingredients = $derived(meta.buildsOn.map(chapter));
	const after = $derived(next(meta.slug));
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
		<main id="content" class="prose">
			<header>
				<p class="label">{partLabel(meta.part, ' · ')}</p>
				<h1><span class="num">{label(meta.slug)}.</span> {meta.title}</h1>
			</header>

			<IngredientsBox
				chapters={ingredients}
				empty={meta.number === 0 ? undefined : 'Everything from the earlier chapters.'}
			/>

			{#key meta.slug}
				<CitationScope>
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

	.next a {
		font-size: 1.25rem;
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
