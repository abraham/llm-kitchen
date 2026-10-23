<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import SamplerWheel from '#lib/components/primitives/SamplerWheel.svelte';
	import { applyTemperature, sampleIndex, topK } from '#lib/math/sampling.ts';

	import { canonical } from '#lib/models/provider.ts';

	const SHOWN = 10;
	const id = $props.id();
	const trace = useDataset('traces/the-cat-sat');

	let temperature = $state(1);
	let k = $state(SHOWN);
	let lastPick = $state<number | null>(null);
	let spins = $state(0);
	let tally = $state<number[] | null>(null);

	function distribution(base: { label: string; p: number }[]) {
		const tempered = applyTemperature(
			base.map((b) => b.p),
			temperature
		);
		const kept = new Set(
			topK(
				tempered.map((p, i) => ({ item: i, p })),
				k
			).map((w) => w.item)
		);
		const masked = tempered.map((p, i) => (kept.has(i) ? p : 0));
		const sum = masked.reduce((a, b) => a + b, 0);
		return base.map((b, i) => ({ label: b.label, p: masked[i] / sum }));
	}

	function sampleOnce(probs: number[]) {
		lastPick = sampleIndex(probs, Math.random());
		spins++;
	}

	function sampleMany(probs: number[]) {
		const counts = probs.map(() => 0);
		for (let i = 0; i < 20; i++) counts[sampleIndex(probs, Math.random())]++;
		tally = counts;
		lastPick = null;
	}

	function reset() {
		temperature = 1;
		k = SHOWN;
		lastPick = null;
		tally = null;
	}
</script>

<WidgetFrame
	title="Temperature and top-k"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={reset}
>
	<Loading promise={trace}>
		{#snippet children(t)}
			{@const raw = t.steps[0].candidates.slice(0, SHOWN)}
			{@const total = raw.reduce((a, c) => a + c.prob, 0)}
			{@const base = raw.map((c) => ({ label: c.token.text, p: c.prob / total }))}
			{@const dist = distribution(base)}
			{@const probs = dist.map((d) => d.p)}

			<div class="sliders">
				<div class="slider">
					<label class="label" for="{id}-temperature">
						Temperature <span class="mono" aria-hidden="true">{temperature.toFixed(2)}</span>
					</label>
					<input
						id="{id}-temperature"
						type="range"
						min="0"
						max="2"
						step="0.05"
						bind:value={temperature}
						oninput={() => (tally = null)}
					/>
				</div>
				<div class="slider">
					<label class="label" for="{id}-topk">
						Top-k <span class="mono" aria-hidden="true">{k}</span>
					</label>
					<input
						id="{id}-topk"
						type="range"
						min="1"
						max={SHOWN}
						step="1"
						bind:value={k}
						oninput={() => (tally = null)}
					/>
				</div>
			</div>
			<p class="hint">
				{#if temperature === 0}
					Temperature 0: always pick the most likely word.
				{:else if temperature < 1}
					Below 1: the likely words get likelier, the rest fade.
				{:else if temperature > 1}
					Above 1: the chances even out, so unlikely words get picked more.
				{:else}
					Temperature 1: the model's own probabilities.
				{/if}
				{#if k < SHOWN}Top-k {k}: only the {k} most likely words can be picked.{/if}
			</p>

			<div class="stage">
				<ProbBars
					caption="Chance of each next word with these settings"
					scaleTo="one"
					bars={dist.map((d, i) => ({ ...d, highlight: lastPick === i }))}
				/>
				<SamplerWheel
					slices={dist.filter((d) => d.p > 0)}
					landOn={lastPick === null
						? null
						: dist.filter((d) => d.p > 0).findIndex((d) => d.label === dist[lastPick!].label)}
					spin={spins}
				/>
			</div>

			<div class="actions">
				<button type="button" onclick={() => sampleOnce(probs)}>Spin once</button>
				<button type="button" onclick={() => sampleMany(probs)}>Sample 20 times</button>
			</div>

			{#if tally}
				<div class="tally" aria-live="polite">
					<p class="label">20 samples</p>
					<ol>
						{#each dist as d, i (d.label)}
							{#if tally[i] > 0}
								<li>
									<span class="mono">{d.label}</span>
									<span class="marks">{'▮'.repeat(tally[i])}</span>
									{tally[i]}
								</li>
							{/if}
						{/each}
					</ol>
				</div>
			{/if}
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.sliders {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
	}

	.slider {
		display: flex;
		flex-direction: column;
	}

	input[type='range'] {
		accent-color: var(--c-prob);
	}

	.hint {
		min-height: 3em;
		font-size: 0.95rem;
	}

	.stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: center;
	}

	@media (min-width: 48rem) {
		.stage {
			grid-template-columns: minmax(0, 1fr) auto;
		}
	}

	.actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.tally ol {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.9rem;
	}

	.marks {
		color: var(--c-prob);
		letter-spacing: -1px;
	}
</style>
