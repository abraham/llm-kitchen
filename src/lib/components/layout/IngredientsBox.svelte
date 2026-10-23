<script lang="ts">
	import { resolve } from '$app/paths';
	import { writtenChapters, type ChapterMeta } from '#lib/chapters/index.ts';

	let { chapters, empty }: { chapters: ChapterMeta[]; empty?: string } = $props();

	const written = new Set(writtenChapters().map((c) => c.slug));
</script>

<aside class="ingredients" aria-labelledby="ingredients-title">
	<p class="label" id="ingredients-title">Ingredients</p>
	{#if chapters.length === 0}
		<p>{empty ?? 'Nothing. This is where to start.'}</p>
	{:else}
		<ul>
			{#each chapters as chapter (chapter.slug)}
				<li>
					{#if written.has(chapter.slug)}
						<a href={resolve('/[chapter]', { chapter: chapter.slug })}
							>Ch {chapter.number}. {chapter.title}</a
						>
					{:else}
						Ch {chapter.number}. {chapter.title}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</aside>

<style>
	.ingredients {
		border-left: 3px solid var(--rule);
		padding: var(--space-2) var(--space-4);
		margin-block: var(--space-6);
		background: var(--surface-2);
		border-radius: 0 var(--radius) var(--radius) 0;
	}

	.label {
		margin: 0 0 var(--space-1);
		text-transform: uppercase;
		font-weight: 600;
	}

	ul,
	p {
		margin: 0;
	}

	ul {
		padding-left: var(--space-4);
	}
</style>
