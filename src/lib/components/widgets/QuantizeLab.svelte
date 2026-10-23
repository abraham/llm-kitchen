<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import { levels, type QuantizeRun } from '#lib/math/quantize.ts';
	import { loadJson } from '#lib/models/load-json.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = loadJson<QuantizeRun>('quantize/gpt2.json');
	const id = $props.id();
	let index = $state(0);

	const W = 560;
	const H = 96;
	const PAD = 8;
	const ROW = { trained: 28, rounded: 72 };
	const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;
</script>

<WidgetFrame
	title="Rounding GPT-2's numbers"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => (index = 0)}
>
	<Loading promise={data}>
		{#snippet children(run)}
			{@const full = run.precisions[0]}
			{@const p = run.precisions[index]}
			{@const max = run.sample.max * 1.05}
			{@const x = (v: number) => PAD + ((v + max) / (2 * max)) * (W - PAD - 8)}
			{@const grid = p.kind === 'int' ? levels(p.bits, run.sample.max) : []}
			{@const same = p.generated.every((t, i) => t.id === full.generated[i].id)}
			<div class="slider">
				<label class="label" for="{id}-bits">
					Bits per number <span class="mono" aria-hidden="true">{p.bits}</span>
				</label>
				<input
					id="{id}-bits"
					type="range"
					min="0"
					max={run.precisions.length - 1}
					step="1"
					value={run.precisions.length - 1 - index}
					oninput={(e) => (index = run.precisions.length - 1 - Number(e.currentTarget.value))}
					aria-valuetext="{p.bits} bits"
				/>
			</div>

			<div class="size">
				<span class="label">Weights</span>
				<span class="bar"><span style:width="{(p.bytes / full.bytes) * 100}%"></span></span>
				<span class="mono">{mb(p.bytes)}</span>
			</div>

			<figure class="row">
				<p class="legend" aria-hidden="true">
					<span><span class="dot trained-dot"></span>as trained (top)</span>
					<span><span class="dot rounded-dot"></span>{p.label} (bottom)</span>
				</p>
				<svg
					viewBox="0 0 {W} {H}"
					role="img"
					aria-label={p.kind === 'int'
						? `${run.block} weights before and after rounding: each can only take one of ${grid.length} values`
						: `${run.block} weights before and after rounding to ${p.bits}-bit floats: they barely move`}
				>
					{#each grid.length <= 64 ? grid : [] as g, i (i)}
						<line class="level" x1={x(g)} x2={x(g)} y1="14" y2={H - 10} />
					{/each}
					{#each full.row as v, i (i)}
						<line class="move" x1={x(v)} y1={ROW.trained} x2={x(p.row[i])} y2={ROW.rounded} />
						<circle class="trained" cx={x(v)} cy={ROW.trained} r="3.5" />
						<circle class="rounded" cx={x(p.row[i])} cy={ROW.rounded} r="3.5" />
					{/each}
				</svg>
				<figcaption>
					{#if p.kind === 'int'}
						{run.block} of GPT-2's weights. At {p.bits} bits, each group of {run.block} can only take
						{grid.length} values (the grey lines{grid.length > 64
							? ', too close together to draw'
							: ''}), set by its largest number.
					{:else}
						{run.block} of GPT-2's weights. {p.bits}-bit floats keep
						{p.bits === 32 ? 'about 7' : 'about 3'} significant digits, so the weights {p.bits ===
						32
							? "don't move"
							: 'barely move'}.
					{/if}
				</figcaption>
			</figure>

			<div class="results">
				<ProbBars
					caption="Next word after “{run.prompt}”"
					bars={p.candidates.map((c) => ({ label: displayToken(c.token.text), p: c.prob }))}
				/>
				<div>
					<p class="label">GPT-2 continues</p>
					<p class="generated">
						{run.prompt}<strong
							>{p.generated
								.map((t) => t.text)
								.join('')
								.split('\n')[0]}</strong
						>…
					</p>
					<p class="verdict">
						{#if index === 0}
							The weights as trained.
						{:else if same}
							Same words as the weights as trained.
						{:else}
							Different words from the weights as trained.
						{/if}
						Loss on a test passage: <span class="mono">{p.loss.toFixed(2)}</span>
						{#if index > 0}(as trained: <span class="mono">{full.loss.toFixed(2)}</span>){/if}
					</p>
				</div>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.slider {
		display: grid;
		gap: var(--space-1);
		max-width: 24rem;
		margin-bottom: var(--space-3);
	}

	.size {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		font-size: 0.9rem;
	}

	.bar {
		height: 1rem;
		background: var(--surface-2);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--c-weight);
		transition: width var(--duration) var(--ease);
	}

	@media (prefers-reduced-motion: reduce) {
		.bar span {
			transition: none;
		}
	}

	.row {
		margin: 0 0 var(--space-3);
	}

	svg {
		width: 100%;
		max-width: 36rem;
		height: auto;
		display: block;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: 0 0 var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		margin-right: var(--space-1);
	}

	.trained-dot {
		background: var(--c-weight);
	}

	.rounded-dot {
		background: var(--c-loss);
	}

	.level {
		stroke: var(--rule);
	}

	.move {
		stroke: var(--ink-muted);
		stroke-width: 0.75;
	}

	.trained {
		fill: var(--c-weight);
	}

	.rounded {
		fill: var(--c-loss);
	}

	figcaption {
		font-size: 0.9rem;
		color: var(--ink-muted);
	}

	.results {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 44rem) {
		.results {
			grid-template-columns: 1fr 1fr;
		}
	}

	.results p {
		margin: 0 0 var(--space-2);
	}

	.generated {
		white-space: pre-wrap;
	}

	.generated strong {
		color: var(--c-weight-ink);
	}

	.verdict {
		font-size: 0.9rem;
		color: var(--ink-muted);
	}
</style>
