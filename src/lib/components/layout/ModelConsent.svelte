<script lang="ts">
	import { onMount } from 'svelte';
	import type { BrowserModel } from '#lib/models/browser-model.svelte.ts';
	import { RUNTIME_MB, runtimeBuild, type RuntimeBuild } from '#lib/models/onnx-runtime.ts';

	let { model, purpose }: { model: BrowserModel; purpose: string } = $props();

	const id = $props.id();
	// The prerendered page assumes the usual build; the browser corrects it after hydration.
	let build = $state<RuntimeBuild>('asyncify');
	onMount(() => {
		build = runtimeBuild(navigator);
	});
	const runtimeMB = $derived(RUNTIME_MB[build]);
	const downloadMB = $derived(model.spec.modelMB + runtimeMB);
</script>

<div class="consent">
	{#if model.status.state === 'idle'}
		<p id="{id}-title" class="title">Run a real model in your browser?</p>
		<p>
			{purpose} This downloads <strong>{model.spec.label}</strong>: about {model.spec.modelMB} MB for
			the model plus {runtimeMB} MB for the code that runs it, about {downloadMB}
			MB in total. Your browser keeps a copy, so it's only downloaded once. Everything runs on your device;
			nothing you type is sent anywhere.
		</p>
		<button type="button" onclick={() => model.load()}>
			Download about {downloadMB} MB and run it
		</button>
	{:else if model.status.state === 'loading'}
		<p id="{id}-title" class="title">Downloading {model.spec.label}…</p>
		<progress
			max="1"
			value={model.status.fraction ?? undefined}
			aria-label="Download progress for {model.spec.label}"
		></progress>
		{#if model.status.fraction !== null}
			<span class="mono">{Math.round(model.status.fraction * 100)}%</span>
		{/if}
	{:else if model.status.state === 'ready'}
		<p id="{id}-title" class="title ready" role="status">
			{model.spec.label} is running in your browser
			{model.status.device === 'webgpu'
				? 'on your graphics card (WebGPU)'
				: 'on your processor (WebAssembly)'}.
		</p>
	{:else}
		<p id="{id}-title" class="title error" role="alert">
			Couldn't load the model: {model.status.message}
		</p>
		<button type="button" onclick={() => model.load()}>Try again</button>
	{/if}
</div>

<style>
	.consent {
		margin-top: var(--space-4);
		padding: var(--space-3) var(--space-4);
		border: 1px dashed var(--c-prob);
		border-radius: var(--radius);
		font-size: 0.95rem;
	}

	.title {
		font-weight: 600;
		margin: 0 0 var(--space-2);
	}

	.ready {
		color: var(--c-vector-ink);
		margin: 0;
	}

	.error {
		color: var(--c-loss-ink);
	}

	progress {
		width: min(20rem, 100%);
		accent-color: var(--c-prob);
	}
</style>
