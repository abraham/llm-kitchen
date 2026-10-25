<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LiveOption } from '#lib/models/live.svelte.ts';
	import Toggle from '../ui/Toggle.svelte';
	import DataSourceBadge from './DataSourceBadge.svelte';
	import type { DataSource } from './data-source.ts';

	let {
		title,
		label = 'Try it',
		source,
		live,
		onreset,
		controls,
		children
	}: {
		title: string;
		label?: string;
		source?: DataSource;
		/** The widget's live option: when a model runs it, a switch back to the recording. */
		live?: LiveOption;
		onreset?: () => void;
		/** Step controls or other inputs, shown under the widget. */
		controls?: Snippet;
		children: Snippet;
	} = $props();

	const id = $props.id();
	/** Bumped by Reset, which re-creates the body so components inside it start over too. */
	let generation = $state(0);

	function reset() {
		onreset?.();
		generation++;
	}
</script>

<section class="widget breakout" aria-labelledby="{id}-title">
	<header>
		<span class="label">{label}</span>
		<p class="title" id="{id}-title">{title}</p>
		<span class="meta">
			{#if source}<DataSourceBadge {source} />{/if}
			{#if live?.state.state === 'live'}
				<Toggle label="Show the recording" bind:checked={live.showRecording} />
			{/if}
			{#if onreset}
				<button type="button" onclick={reset}>Reset</button>
			{/if}
		</span>
	</header>
	<div class="body">
		{#key generation}
			{@render children()}
		{/key}
	</div>
	{#if controls}
		<footer>{@render controls()}</footer>
	{/if}
</section>

<style>
	.widget {
		margin-block: var(--space-8);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: calc(var(--radius) * 2);
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--rule);
	}

	.label {
		text-transform: uppercase;
		font-weight: 600;
	}

	.title {
		margin: 0;
		font-weight: 600;
		flex: 1;
	}

	.meta {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
	}

	@media (max-width: 40rem) {
		.title {
			order: 1;
			flex-basis: 100%;
		}

		.meta {
			margin-inline-start: auto;
		}
	}

	.body {
		padding: var(--space-4);
		overflow-x: auto;
	}

	footer {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--rule);
		background: var(--surface-2);
		border-radius: 0 0 calc(var(--radius) * 2) calc(var(--radius) * 2);
	}
</style>
