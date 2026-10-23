<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { chapterByNumber, partLabel, type ChapterMeta } from '#lib/chapters/index.ts';
	import { SITE_NAME } from '#lib/site.ts';
	import CitationScope from './CitationScope.svelte';
	import IngredientsBox from './IngredientsBox.svelte';
	import ProgressNav from './ProgressNav.svelte';

	let { meta, next, children }: { meta: ChapterMeta; next?: ChapterMeta; children: Snippet } =
		$props();

	const ingredients = $derived(meta.buildsOn.map(chapterByNumber));
</script>

<div class="chapter-layout">
	<a class="skip" href="#content">Skip to content</a>

	<aside class="rail">
		<details class="rail-toggle">
			<summary>Chapters</summary>
			<ProgressNav current={meta.slug} />
		</details>
		<div class="rail-static">
			<a class="home" href={resolve('/')}>{SITE_NAME}</a>
			<ProgressNav current={meta.slug} />
		</div>
	</aside>

	<div class="column">
		<main id="content" class="prose">
			<header>
				<p class="label">{partLabel(meta.part, ' · ')}</p>
				<h1><span class="num">Ch {meta.number}.</span> {meta.title}</h1>
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
				{#if next}
					<p class="label">Up next</p>
					<a href={resolve('/[chapter]', { chapter: next.slug })}>
						Ch {next.number}. {next.title} →
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

	.skip {
		position: absolute;
		left: var(--space-4);
		top: -3rem;
		z-index: 20;
		padding: var(--space-2) var(--space-3);
		background: var(--surface);
		border: 1px solid var(--rule);
	}

	.skip:focus {
		top: var(--space-2);
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

	.home {
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
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
			top: 0;
			max-height: 100vh;
			overflow-y: auto;
			padding-block: var(--space-6);
		}
	}
</style>
