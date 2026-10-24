<script lang="ts">
	import ModelConsent from '#lib/components/frame/ModelConsent.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import type { TraceName } from '#lib/datasets/registry.ts';
	import { displayToken, formatCount, formatPercent } from '#lib/components/primitives/format.ts';
	import { applyTemperature, sampleIndex } from '#lib/math/sampling.ts';
	import { CANONICAL_LIVE, browserModel } from '#lib/models/browser-model.svelte.ts';
	import { BrowserProvider } from '#lib/models/browser-provider.ts';
	import { all, useDatasets } from '#lib/datasets/use.ts';
	import {
		NotAvailableError,
		canonical,
		type NextTokenDistribution,
		type Token
	} from '#lib/models/provider.ts';
	import { RecordedProvider } from '#lib/models/recorded.ts';
	import { tokenize } from '#lib/models/tokenizers.ts';
	import type { Trace } from '#lib/models/trace.ts';
	import { untrack } from 'svelte';

	let {
		presets,
		branches = [],
		title = 'Glass-box generator'
	}: {
		/** Recorded starting points (trace names). */
		presets: { trace: TraceName; label: string }[];
		/** Extra recordings to follow when the visitor picks a different token. */
		branches?: TraceName[];
		title?: string;
	} = $props();

	const SHOWN = 10;
	const TOP_K = 50;
	const model = browserModel(CANONICAL_LIVE);
	const liveProvider = new BrowserProvider(model, 'gpt2');
	const id = $props.id();

	let traces = $state<Trace[]>([]);
	let provider = $state<RecordedProvider | null>(null);
	let preset = $state(0);
	let tokens = $state<Token[]>([]);
	let history = $state<Token[][]>([]);
	let dist = $state<NextTokenDistribution | null>(null);
	let notice = $state('');
	let busy = $state(false);
	let temperature = $state(1);
	let useLive = $state(true);
	let wantLive = $state(false);
	let custom = $state('');
	let runs = $state(0);
	let request = 0;

	const live = $derived(model.status.state === 'ready' && useLive);
	const text = (t: Token[]) => t.map((x) => x.text).join('');
	const probs = $derived.by(() => {
		const p = dist?.candidates.map((c) => c.prob) ?? [];
		return live && temperature !== 1 ? applyTemperature(p, temperature) : p;
	});

	function setup(loaded: Trace[]) {
		traces = loaded;
		provider = new RecordedProvider(loaded);
		preset = 0;
		tokens = loaded[0].tokens;
		history = [];
		// The first recorded step is what the provider would answer for the prompt.
		dist = loaded[0].steps[0];
	}

	const datasets = useDatasets();
	const initial = all(
		untrack(() => [...presets.map((p) => p.trace), ...branches]).map((name) =>
			datasets(`traces/${name}`)
		)
	);
	if (Array.isArray(initial)) setup(initial);
	else $effect(() => void initial.then(setup));

	// Switching between recorded and live data re-asks for the current text.
	$effect(() => {
		void live;
		untrack(() => tokens.length && refresh());
	});

	async function refresh() {
		const mine = ++request;
		busy = true;
		notice = '';
		try {
			const d = live
				? await liveProvider.nextTokenDistribution(tokens, { topK: TOP_K })
				: await provider!.nextTokenDistribution(tokens);
			if (mine !== request) return;
			dist = d;
			runs++;
		} catch (error) {
			if (mine !== request) return;
			dist = null;
			notice =
				error instanceof NotAvailableError
					? `No recording continues from here. Undo, or run ${canonical.displayName} in your browser to keep going.`
					: `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			if (mine === request) busy = false;
		}
	}

	function start(index: number) {
		preset = index;
		tokens = traces[index].tokens;
		history = [];
		refresh();
	}

	async function startCustom() {
		const value = custom.trim();
		if (!value) return;
		tokens = await tokenize('gpt2', value);
		history = [];
		refresh();
	}

	function append(token: Token) {
		history = [...history, tokens];
		tokens = [...tokens, token];
		refresh();
	}

	function undo() {
		const previous = history.at(-1);
		if (!previous) return;
		history = history.slice(0, -1);
		tokens = previous;
		refresh();
	}

	function available(token: Token): boolean {
		return live || (provider?.has(text(tokens) + token.text) ?? false);
	}

	const stages = [
		{ label: 'Tokens', color: 'token' },
		{ label: 'Vectors', color: 'vector' },
		{ label: `${canonical.layers} blocks`, color: 'attention' },
		{ label: 'Probabilities', color: 'prob' },
		{ label: 'Pick and append', color: 'token' }
	];
</script>

<WidgetFrame
	{title}
	source={live
		? { kind: 'live', model: CANONICAL_LIVE.label }
		: { kind: 'recorded', model: canonical.displayName }}
	onreset={() => {
		temperature = 1;
		start(0);
	}}
>
	<div class="start">
		<label for="{id}-preset" class="label">Start from</label>
		<select id="{id}-preset" value={preset} onchange={(e) => start(Number(e.currentTarget.value))}>
			{#each presets as p, i (p.trace)}<option value={i}>{p.label}</option>{/each}
		</select>
		{#if live}
			<form
				class="custom"
				onsubmit={(e) => {
					e.preventDefault();
					startCustom();
				}}
			>
				<label for="{id}-custom" class="label">or your own</label>
				<input id="{id}-custom" type="text" bind:value={custom} placeholder="Type a beginning…" />
				<button type="submit">Start</button>
			</form>
		{/if}
	</div>

	{#key runs}
		<ol class="pipeline" aria-hidden="true">
			{#each stages as s, i (s.label)}
				<li style:--c="var(--c-{s.color})" style:--i={i}>{s.label}</li>
			{/each}
		</ol>
	{/key}

	<div class="context" aria-label="Text so far" aria-live="polite">
		{#each tokens as token, i (i)}
			<TokenChip {token} state={history.length && i === tokens.length - 1 ? 'new' : 'default'} />
		{/each}
	</div>

	{#if notice}
		<p class="notice" role="status">{notice}</p>
	{:else if dist}
		<p class="label">
			What comes next? Top {SHOWN} of {formatCount(canonical.vocabularySize)}
			{#if live && temperature !== 1}(reweighted among the top {TOP_K}){/if}
		</p>
		<ol class="candidates" class:busy aria-label="Next-token candidates. Pick one to add it.">
			{#each dist.candidates.slice(0, SHOWN) as c, i (c.token.id)}
				{@const ok = available(c.token)}
				<li>
					<button
						type="button"
						disabled={!ok || busy}
						onclick={() => append(c.token)}
						aria-label="Add “{displayToken(c.token.text)}”, {formatPercent(probs[i])}{ok
							? ''
							: ' (no recording)'}"
					>
						<span class="tok mono">{displayToken(c.token.text)}</span>
						<span class="bar"
							><span style:width="{Math.min(probs[i] / Math.max(probs[0], 1e-9), 1) * 100}%"
							></span></span
						>
						<span class="pct mono">{formatPercent(probs[i])}</span>
					</button>
				</li>
			{/each}
		</ol>
		{#if !live}
			<p class="note">
				Greyed-out choices have no recording. Run the model live to try any of them.
			</p>
		{/if}
	{/if}

	{#snippet controls()}
		<div class="actions">
			<button
				type="button"
				disabled={!dist || busy}
				onclick={() => dist && append(dist.candidates[0].token)}>Add the most likely</button
			>
			{#if live}
				<button
					type="button"
					disabled={!dist || busy}
					onclick={() => dist && append(dist.candidates[sampleIndex(probs, Math.random())].token)}
					>Spin for one</button
				>
				<label class="temp" for="{id}-temp">
					Temperature <span class="mono">{temperature.toFixed(1)}</span>
				</label>
				<input id="{id}-temp" type="range" min="0.1" max="2" step="0.1" bind:value={temperature} />
			{/if}
			<button type="button" disabled={!history.length || busy} onclick={undo}>Undo</button>
		</div>
	{/snippet}

	{#if model.status.state === 'ready'}
		<label class="toggle">
			<input type="checkbox" bind:checked={useLive} />
			Use {canonical.displayName} running in your browser
		</label>
		<p class="note">
			The live copy is compressed to 8 bits, so its percentages differ somewhat from the recorded
			ones.
		</p>
	{:else if wantLive || model.status.state !== 'idle'}
		<ModelConsent
			{model}
			purpose="Type any beginning, pick any token, and set the temperature, with {canonical.displayName} running live."
		/>
	{:else}
		<button type="button" class="more" onclick={() => (wantLive = true)}>Run it live…</button>
	{/if}
</WidgetFrame>

<style>
	.start {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-3);
	}

	.custom {
		display: contents;
	}

	select,
	input[type='text'] {
		font: inherit;
		font-size: 0.9rem;
	}

	input[type='text'] {
		min-width: 14rem;
	}

	.pipeline {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.75rem;
	}

	.pipeline li {
		padding: 2px var(--space-2);
		border: 1.5px solid var(--c);
		border-radius: 3px;
		color: var(--ink-muted);
		animation: light calc(var(--duration) * 2) var(--ease) calc(var(--i) * var(--duration)) both;
	}

	.pipeline li:not(:last-child)::after {
		content: ' →';
	}

	@keyframes light {
		50% {
			background: color-mix(in oklch, var(--c) 25%, var(--surface));
			color: var(--ink);
		}
	}

	.context {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: var(--space-4);
	}

	.candidates {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 2px;
		max-width: 32rem;
	}

	.candidates.busy {
		opacity: 0.6;
	}

	.candidates button {
		display: grid;
		grid-template-columns: 7rem 1fr 4rem;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 0;
		padding: 2px var(--space-2);
		text-align: left;
		background: var(--surface);
	}

	.candidates button:disabled {
		opacity: 0.5;
	}

	.tok {
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar {
		height: 0.7rem;
		background: var(--c-prob-tint);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--c-prob);
	}

	.pct {
		text-align: right;
		font-size: 0.85rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}

	.temp {
		font-family: var(--font-sans);
		font-size: 0.85rem;
	}

	input[type='range'] {
		accent-color: var(--c-prob);
	}

	.notice {
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--c-loss);
		background: var(--surface-2);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}

	.toggle {
		display: block;
		margin-top: var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	.more {
		margin-top: var(--space-4);
	}
</style>
