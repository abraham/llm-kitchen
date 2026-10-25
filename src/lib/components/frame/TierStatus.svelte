<script lang="ts">
	import { resolve } from '$app/paths';
	import type { LiveOption } from '#lib/models/live.svelte.ts';
	import { modelTier } from '#lib/stores/model-tier.svelte.ts';

	let { option, purpose }: { option: LiveOption; purpose: string } = $props();

	const state = $derived(option.state);
	const tier = $derived(modelTier.tier.name);
	const model = $derived(option.model?.spec.label ?? '');
</script>

{#if state.state === 'recorded'}
	<p class="tier-status">
		{purpose}
		<a href={resolve('/downloads')}>Choose a model tier</a> to run a real model in your browser.
	</p>
{:else if state.state === 'uncovered'}
	<p class="tier-status">
		The {tier} tier has no model for this widget, so it shows the recording.
		<a href={resolve('/downloads')}>Models</a>
	</p>
{:else if state.state === 'checking' || state.state === 'downloading'}
	<div class="tier-status" role="status">
		<p>Downloading the {tier} tier; this widget runs live when it's done.</p>
		<progress
			max="1"
			value={state.state === 'downloading' ? state.fraction : undefined}
			aria-label="Download progress for the {tier} tier"
		></progress>
		<span class="mono">{Math.round(modelTier.doneMB)} of {modelTier.totalMB} MB</span>
	</div>
{:else if state.state === 'failed'}
	<p class="tier-status error" role="alert">
		The {tier} tier didn't finish downloading: {state.message}
		<a href={resolve('/downloads')}>Models</a>
	</p>
{:else if state.state === 'starting'}
	<p class="tier-status" role="status">Starting {model} in your browser…</p>
{:else if state.state === 'stopped'}
	<div class="tier-status" role="alert">
		<p class="error">{model} didn't start: {state.message}</p>
		<button type="button" onclick={() => option.model?.load()}>Try again</button>
	</div>
{:else if !option.showRecording}
	<p class="tier-status note">
		{model} is running in your browser
		{state.device === 'webgpu' ? 'on your graphics card' : 'on your processor'}. Live results differ
		from the numbers in the text.
	</p>
{/if}

<style>
	.tier-status {
		margin: var(--space-4) 0 0;
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--ink-muted);
	}

	.tier-status p {
		margin: 0 0 var(--space-1);
	}

	.error {
		color: var(--c-loss-ink);
	}

	progress {
		width: min(16rem, 100%);
		accent-color: var(--c-prob);
		vertical-align: middle;
	}
</style>
