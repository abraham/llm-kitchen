<script lang="ts">
	import { resolve } from '$app/paths';
	import Choice, { type Option } from '#lib/components/ui/Choice.svelte';
	import PageMeta from '#lib/components/page/PageMeta.svelte';
	import { chapter } from '#lib/curriculum/index.ts';
	import { browserModel, type BrowserModel } from '#lib/models/browser-model.svelte.ts';
	import { DOWNLOADS, filesUrl, originalUrl } from '#lib/models/downloads.ts';
	import { RUNTIME_MB } from '#lib/models/onnx-runtime.ts';
	import { TIERS, tier, tierMB, tierModels, type TierId } from '#lib/models/tiers.ts';
	import { MENU_IMAGE, SITE_NAME } from '#lib/site.ts';
	import { modelTier } from '#lib/stores/model-tier.svelte.ts';

	const models = DOWNLOADS.map((spec) => browserModel(spec));
	const keepsDownloads = $derived(models.every((m) => m.keepsDownloads));
	const downloaded = $derived(models.filter((m) => m.cached));
	const downloadedMB = $derived(downloaded.reduce((a, m) => a + m.spec.modelMB, 0));
	const tierState = $derived(modelTier.state);

	const OPTIONS: Option<TierId>[] = TIERS.map((t) => ({
		value: t.id,
		label: t.id === 'recorded' ? 'Show recordings (default)' : `${t.name}: about ${tierMB(t)} MB`
	}));

	/** Each tier's models that no earlier tier includes. */
	const GROUPS = TIERS.map((t, i) => {
		const earlier = new Set(TIERS.slice(0, i).flatMap((e) => tierModels(e)));
		return {
			tier: t,
			models: tierModels(t)
				.filter((m) => !earlier.has(m))
				.map(browserModel)
		};
	}).filter((g) => g.models.length);

	$effect(() => modelTier.load());

	function inChosenTier(model: BrowserModel): boolean {
		return modelTier.models.includes(model);
	}

	function stateText(model: BrowserModel): string {
		const { status } = model;
		switch (status.state) {
			case 'checking':
				return 'Checking…';
			case 'missing':
				if (!model.keepsDownloads) return "This browser doesn't keep downloads";
				return inChosenTier(model) && tierState.state === 'downloading'
					? 'Waiting to download'
					: 'Not downloaded';
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

	/** Removing a model of the chosen tier sets the choice back to Recorded. */
	function remove(model: BrowserModel) {
		if (inChosenTier(model)) modelTier.choose('recorded');
		void model.remove();
	}

	function removeAll() {
		modelTier.choose('recorded');
		for (const model of downloaded) void model.remove();
	}
</script>

<PageMeta
	title="Models and downloads · {SITE_NAME}"
	shareTitle="Models"
	description="Choose whether {SITE_NAME}'s widgets replay recordings or run real models in your browser: what each tier downloads, how big it is, and where the models come from."
	path={resolve('/downloads')}
	image={MENU_IMAGE}
	imageAlt="{SITE_NAME}: models"
	type="website"
/>

<main id="content" class="prose downloads">
	<h1>Models</h1>
	<p class="lede">
		Widgets replay real runs recorded ahead of time. Choose a tier to run real models in your
		browser instead: its models download from Hugging Face and stay in this browser until you remove
		them or it clears space.
	</p>

	<div class="tiers">
		<Choice
			legend="Widgets"
			layout="stack"
			options={OPTIONS}
			bind:value={() => modelTier.choice, (id) => modelTier.choose(id)}
		>
			{#snippet option(o)}
				<span class="tier">
					<strong>{o.label}</strong>
					<span class="summary">{tier(o.value).summary}</span>
				</span>
			{/snippet}
		</Choice>

		{#if tierState.state === 'checking'}
			<p class="status" role="status">Checking…</p>
		{:else if tierState.state === 'downloading'}
			<div class="state" role="status">
				<p class="status">
					Downloading the {modelTier.tier.name} tier: {Math.round(modelTier.doneMB)} of
					{modelTier.totalMB} MB
				</p>
				<progress
					max="1"
					value={tierState.fraction}
					aria-label="Download progress for the {modelTier.tier.name} tier"
				></progress>
			</div>
		{:else if tierState.state === 'error'}
			<div class="state">
				<p class="status error" role="alert">{tierState.message}</p>
				<button type="button" onclick={() => modelTier.download()}>Try again</button>
			</div>
		{:else if tierState.state === 'ready'}
			<p class="status" role="status">
				The {modelTier.tier.name} tier is ready: the widgets it covers run live.
			</p>
		{/if}
	</div>

	{#each GROUPS as group (group.tier.id)}
		<h2>{group.tier.name}</h2>
		{#each group.models as model (model.spec.onnxId)}
			{@const spec = model.spec}
			{@const id = `model-${spec.onnxId.replace('/', '-')}`}
			<section class="card" aria-labelledby={id}>
				<h3 {id}>{spec.label}</h3>
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
					{:else if model.status.state === 'error' && inChosenTier(model)}
						<button type="button" onclick={() => modelTier.download()}
							>Try again<span class="visually-hidden"> to download {spec.label}</span></button
						>
					{:else if model.cached && model.status.state !== 'loading'}
						<button type="button" onclick={() => remove(model)}
							>Remove<span class="visually-hidden"> {spec.label}</span></button
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
	{/each}

	<section class="card" aria-labelledby="runtime">
		<h3 id="runtime">ONNX Runtime</h3>
		<p class="does">Runs every model.</p>
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
			<p>This browser doesn't keep downloads, so a chosen tier downloads again on each visit.</p>
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

	.tiers {
		margin-block: var(--space-6);
		font-family: var(--font-sans);
	}

	.tiers :global(fieldset) {
		gap: var(--space-2);
		font-size: 0.95rem;
	}

	.tiers :global(label) {
		display: flex;
		align-items: start;
		gap: var(--space-2);
	}

	.tiers :global(input) {
		margin-top: 0.3em;
	}

	.tier {
		display: grid;
	}

	.summary {
		color: var(--ink-muted);
	}

	.card {
		margin-block: var(--space-4) var(--space-6);
		padding: var(--space-4);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	h3 {
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

	.error {
		color: var(--c-loss-ink);
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
