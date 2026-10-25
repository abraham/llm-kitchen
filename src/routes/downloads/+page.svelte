<script lang="ts">
	import { resolve } from '$app/paths';
	import PageMeta from '#lib/components/page/PageMeta.svelte';
	import { chapter } from '#lib/curriculum/index.ts';
	import { browserModel, type BrowserModel } from '#lib/models/browser-model.svelte.ts';
	import { DOWNLOADS, filesUrl, originalUrl } from '#lib/models/downloads.ts';
	import { RUNTIME_MB } from '#lib/models/onnx-runtime.ts';
	import { MENU_IMAGE, SITE_NAME } from '#lib/site.ts';

	const models = DOWNLOADS.map((spec) => browserModel(spec));
	const keepsDownloads = $derived(models.every((m) => m.keepsDownloads));
	const downloaded = $derived(models.filter((m) => m.cached));
	const downloadedMB = $derived(downloaded.reduce((a, m) => a + m.spec.modelMB, 0));

	function stateText(model: BrowserModel): string {
		const { status } = model;
		switch (status.state) {
			case 'checking':
				return 'Checking…';
			case 'missing':
				return model.keepsDownloads ? 'Not downloaded' : "This browser doesn't keep downloads";
			case 'downloading':
				return `Downloading: ${Math.round(status.fraction * model.spec.modelMB)} of ${model.spec.modelMB} MB`;
			case 'downloaded':
				return 'Downloaded';
			case 'loading':
				return 'Downloaded, and starting in this tab';
			case 'ready':
				return model.cached
					? 'Downloaded, and running in this tab'
					: 'Removed: it keeps running in this tab until the tab reloads';
			case 'error':
				return `Download failed: ${status.message}`;
		}
	}

	function removeAll() {
		for (const model of downloaded) void model.remove();
	}
</script>

<PageMeta
	title="Downloads · {SITE_NAME}"
	shareTitle="Downloads"
	description="The models {SITE_NAME} can run in your browser: how big they are, whether they're downloaded, and where they come from."
	path={resolve('/downloads')}
	image={MENU_IMAGE}
	imageAlt="{SITE_NAME}: downloads"
	type="website"
/>

<main id="content" class="prose downloads">
	<h1>Downloads</h1>
	<p class="lede">
		Some widgets can run a real model in your browser instead of replaying recorded answers. Models
		download only when you ask, from Hugging Face, and stay in this browser until you remove them or
		it clears space.
	</p>

	{#each models as model (model.spec.onnxId)}
		{@const spec = model.spec}
		{@const id = `model-${spec.onnxId.replace('/', '-')}`}
		<section class="card" aria-labelledby={id}>
			<h2 {id}>{spec.label}</h2>
			<p class="does">{spec.does}.</p>
			<dl>
				<dt>Size</dt>
				<dd>{spec.modelMB} MB</dd>
				<dt>Commit</dt>
				<dd class="mono">{spec.onnxRevision.slice(0, 7)}</dd>
				<dt>Used in</dt>
				<dd class="chapters">
					{#each spec.chapters as slug (slug)}
						<a href={resolve('/[chapter]', { chapter: slug })}>{chapter(slug).title}</a>
					{/each}
				</dd>
			</dl>
			<div class="state">
				<p class="status" role="status">{stateText(model)}</p>
				{#if model.status.state === 'downloading'}
					<progress
						max="1"
						value={model.status.fraction}
						aria-label="Download progress for {spec.label}"
					></progress>
				{:else if model.status.state === 'error'}
					<button type="button" onclick={() => model.download()}
						>Try again<span class="visually-hidden"> to download {spec.label}</span></button
					>
				{:else if model.cached && model.status.state !== 'loading'}
					<button type="button" onclick={() => model.remove()}
						>Remove<span class="visually-hidden"> {spec.label}</span></button
					>
				{:else if model.status.state === 'checking' || (model.status.state === 'missing' && model.keepsDownloads)}
					<button
						type="button"
						disabled={model.status.state === 'checking'}
						onclick={() => model.download()}
						>Download<span class="visually-hidden"> {spec.label}</span></button
					>
				{/if}
			</div>
			<p class="links">
				<!-- Links to Hugging Face don't go through SvelteKit routing. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={originalUrl(spec)} rel="noopener noreferrer" target="_blank">Original model</a>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={filesUrl(spec)} rel="noopener noreferrer" target="_blank">Files used here</a>
			</p>
		</section>
	{/each}

	<section class="card" aria-labelledby="runtime">
		<h2 id="runtime">ONNX Runtime</h2>
		<p class="does">Runs either model.</p>
		<dl>
			<dt>Size</dt>
			<dd>{RUNTIME_MB} MB</dd>
		</dl>
		<p>
			It comes from this site the first time a model runs, and your browser keeps it with the site's
			other files.
		</p>
	</section>

	<footer>
		{#if keepsDownloads}
			<p>Downloaded models use {downloadedMB} MB in this browser.</p>
			{#if downloaded.length > 0}
				<button type="button" onclick={removeAll}>Remove all</button>
			{/if}
		{:else}
			<p>
				This browser doesn't keep downloads, so the widgets download a model again on each visit.
			</p>
		{/if}
	</footer>
</main>

<style>
	.downloads {
		padding-block: var(--space-8) var(--space-12);
	}

	.lede {
		font-size: 1.125rem;
		color: var(--ink-muted);
	}

	.card {
		margin-block: var(--space-6);
		padding: var(--space-4);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
	}

	.does {
		margin: var(--space-1) 0 var(--space-3);
		color: var(--ink-muted);
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-1) var(--space-4);
		margin: 0 0 var(--space-3);
	}

	dt {
		color: var(--ink-muted);
	}

	dd {
		margin: 0;
	}

	.chapters {
		display: flex;
		flex-wrap: wrap;
		column-gap: 0.3em;
	}

	/* inline-block keeps the link's underline off the comma. */
	.chapters a:not(:last-child)::after {
		content: ',';
		display: inline-block;
		color: var(--ink);
	}

	.state {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}

	.status {
		margin: 0;
		font-weight: 600;
	}

	progress {
		width: min(16rem, 100%);
		accent-color: var(--c-prob);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		margin: var(--space-3) 0 0;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
	}
</style>
