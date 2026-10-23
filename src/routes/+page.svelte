<script lang="ts">
	import { resolve } from '$app/paths';
	import { writtenChapters } from '#lib/chapters/index.ts';

	const chapters = writtenChapters();
</script>

<svelte:head>
	<title>llm-kitchen: how a large language model works</title>
	<meta
		name="description"
		content="An interactive guide to how large language models work, from guessing the next word to agents."
	/>
</svelte:head>

<main>
	<h1>llm-kitchen</h1>
	<p>How a large language model works, one idea at a time.</p>

	<ol>
		{#each chapters as chapter (chapter.slug)}
			<li>
				<a href={resolve('/[chapter]', { chapter: chapter.slug })}>
					Ch {chapter.number}. {chapter.title}
				</a>
			</li>
		{/each}
	</ol>
</main>
