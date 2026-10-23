<script lang="ts">
	import { resolve } from '$app/paths';
	import { writtenChapters, type ChapterMeta } from '#lib/chapters/index.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';

	let { current }: { current?: string } = $props();

	const written = writtenChapters();
	const parts = [...new Set(written.map((c) => c.part))].map((part) => ({
		title: `Part ${part.number}: ${part.title}`,
		chapters: written.filter((c) => c.part === part) as ChapterMeta[]
	}));
</script>

<nav aria-label="Chapters" class="progress-nav">
	{#each parts as part (part.title)}
		<p class="label">{part.title}</p>
		<ol>
			{#each part.chapters as chapter (chapter.slug)}
				<li class:visited={progress.has(chapter.slug)}>
					<a
						href={resolve('/[chapter]', { chapter: chapter.slug })}
						aria-current={chapter.slug === current ? 'page' : undefined}
					>
						<span class="num">{chapter.number}</span>
						{chapter.title}
						{#if progress.has(chapter.slug) && chapter.slug !== current}
							<span class="check" aria-hidden="true">✓</span>
							<span class="visually-hidden">(visited)</span>
						{/if}
					</a>
				</li>
			{/each}
		</ol>
	{/each}
</nav>

<style>
	.progress-nav {
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.label {
		margin: var(--space-4) 0 var(--space-1);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 2px solid var(--rule);
	}

	a {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		margin-left: -2px;
		border-left: 2px solid transparent;
		color: var(--ink-muted);
		text-decoration: none;
	}

	a:hover {
		color: var(--ink);
	}

	a[aria-current='page'] {
		color: var(--ink);
		font-weight: 600;
		border-left-color: var(--c-token);
	}

	.visited a {
		border-left-color: var(--c-token-tint);
	}

	.visited a[aria-current='page'] {
		border-left-color: var(--c-token);
	}

	.num {
		font-family: var(--font-mono);
		min-width: 1.5em;
		text-align: right;
	}

	.check {
		margin-left: auto;
		color: var(--c-vector-ink);
	}
</style>
