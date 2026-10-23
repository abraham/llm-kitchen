<script lang="ts">
	import { findReference, formatAuthors, type Citations } from '#lib/citations.svelte.ts';

	let { citations }: { citations: Citations } = $props();
</script>

{#if citations.ids.length > 0}
	<section class="sources" aria-labelledby="sources-title">
		<h2 id="sources-title">Sources</h2>
		<ol>
			{#each citations.ids as id (id)}
				{@const ref = findReference(id)}
				<li id="source-{id}">
					{formatAuthors(ref.authors)} ({ref.year}).
					<!-- External source links don't go through SvelteKit routing. -->
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={ref.url} rel="noopener noreferrer" target="_blank">{ref.title}</a>.
					<span class="venue">{ref.venue}.</span>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.sources {
		margin-top: var(--space-12);
		font-size: 0.95rem;
	}

	h2 {
		font-size: 1.1rem;
	}

	li {
		margin-bottom: var(--space-2);
	}

	li:target {
		background: var(--c-token-tint);
	}

	.venue {
		color: var(--ink-muted);
	}
</style>
