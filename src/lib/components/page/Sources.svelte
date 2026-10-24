<script lang="ts">
	import {
		findReference,
		formatAuthors,
		sourceAnchor,
		type Citations
	} from '#lib/citations.svelte.ts';
	import { LEVELS } from '#lib/levels.ts';

	let { citations }: { citations: Citations } = $props();

	// One list per level where they differ; global.css shows the current level's.
	const lists = $derived(
		citations.leveled
			? LEVELS.map((level) => ({ level, ids: citations.ids[level] }))
			: [{ level: undefined, ids: citations.ids.standard }]
	);

	const formatDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
</script>

{#each lists as { level, ids } (level)}
	{#if ids.length > 0}
		{@const title = level ? `sources-title-${level}` : 'sources-title'}
		<section class="sources" aria-labelledby={title} data-levels={level}>
			<h2 id={title}>Sources</h2>
			<ol>
				{#each ids as id (id)}
					{@const ref = findReference(id)}
					<li id={sourceAnchor(id, level)}>
						{formatAuthors(ref.authors)} ({ref.year}).
						<!-- External source links don't go through SvelteKit routing. -->
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href={ref.url} rel="noopener noreferrer" target="_blank">{ref.title}</a>.
						<span class="venue">{ref.venue}.</span>
						{#if ref.accessed}<span class="venue">Accessed {formatDate(ref.accessed)}.</span>{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/if}
{/each}

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
