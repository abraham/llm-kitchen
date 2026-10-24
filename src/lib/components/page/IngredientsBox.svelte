<script lang="ts">
	import { resolve } from '$app/paths';
	import { label, type Chapter } from '#lib/curriculum/index.ts';

	let { chapters, empty }: { chapters: Chapter[]; empty?: string } = $props();
</script>

<aside class="ingredients" aria-labelledby="ingredients-title">
	<p class="label" id="ingredients-title">Ingredients</p>
	{#if chapters.length === 0}
		<p>{empty ?? 'Nothing. This is where to start.'}</p>
	{:else}
		<ul>
			{#each chapters as chapter (chapter.slug)}
				<li>
					<a href={resolve('/[chapter]', { chapter: chapter.slug })}
						>{label(chapter.slug)}. {chapter.title}</a
					>
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
