<script lang="ts">
	import { resolve } from '$app/paths';
	import { CURRICULUM, writtenChapters } from '#lib/chapters/index.ts';
	import PageMeta from '#lib/components/layout/PageMeta.svelte';
	import { MENU_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '#lib/site.ts';

	const written = new Set(writtenChapters().map((c) => c.slug));
	const parts = [...new Set(CURRICULUM.map((c) => c.part))].map((part) => ({
		part,
		chapters: CURRICULUM.filter((c) => c.part === part)
	}));
	const first = writtenChapters()[0];
</script>

<PageMeta
	title="{SITE_NAME}: how a large language model works"
	description={SITE_DESCRIPTION}
	path={resolve('/')}
	image={MENU_IMAGE}
	imageAlt="{SITE_NAME}: {SITE_TAGLINE}"
	type="website"
/>

<main class="prose menu">
	<header>
		<p class="label">Today's menu</p>
		<h1>{SITE_NAME}</h1>
		<p class="lede">
			How a large language model works, one idea at a time. Start with guessing the next word, build
			up to an agent that uses tools, and finish with other kinds of models made from the same
			pieces.
		</p>
		{#if first}
			<a class="start" href={resolve('/[chapter]', { chapter: first.slug })}>Start with Ch 0 →</a>
		{/if}
	</header>

	{#each parts as { part, chapters } (part.title)}
		{@const id = `part-${part.number ?? 'wrap-up'}`}
		<section aria-labelledby={id}>
			<h2 {id}>
				{#if part.number}<span class="label">Part {part.number}</span>{/if}
				{part.title}
			</h2>
			<ol>
				{#each chapters as chapter (chapter.slug)}
					<li>
						{#if written.has(chapter.slug)}
							<a href={resolve('/[chapter]', { chapter: chapter.slug })}>{chapter.title}</a>
						{:else}
							<span class="soon">{chapter.title}</span>
						{/if}
						<span class="leader" aria-hidden="true"></span>
						<span class="num">{written.has(chapter.slug) ? '' : 'soon · '}Ch {chapter.number}</span>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</main>

<style>
	.menu {
		padding-block: var(--space-12);
	}

	header {
		text-align: center;
		margin-bottom: var(--space-8);
	}

	header .label {
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}

	.lede {
		font-size: 1.25rem;
		color: var(--ink-muted);
	}

	.start {
		font-family: var(--font-sans);
		font-weight: 600;
	}

	h2 {
		text-align: center;
		font-size: 1.25rem;
		margin-top: var(--space-8);
	}

	h2 .label {
		display: block;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}

	ol {
		list-style: none;
		padding: 0;
	}

	li {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		padding-block: var(--space-1);
	}

	.leader {
		flex: 1;
		border-bottom: 1px dotted var(--rule);
		transform: translateY(-0.3em);
	}

	.num {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.soon {
		color: var(--ink-muted);
	}
</style>
