<script lang="ts">
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import { parameterBreakdown } from '#lib/math/transformer.ts';
	import { label } from '#lib/curriculum/index.ts';
	import { canonical } from '#lib/models/provider.ts';

	const p = parameterBreakdown(canonical);
	const stepper = new Stepper(6);
	const s = $derived(stepper.index);
	const n = (x: number) => x.toLocaleString('en-US');

	const STEPS = [
		`Start: each token becomes its word vector (${label('embeddings')}) plus a position vector (${label('attention')}). This running list of ${canonical.embeddingSize} numbers per token is the stream.`,
		`Attention: each token looks back at earlier tokens (${label('attention')}) and adds what it finds to its stream. The stream itself passes straight through.`,
		`MLP: each token’s vector goes through a layer of ${n(canonical.mlpSize)} neurons (${label('a-neuron')}), and the result is added to the stream too.`,
		'Layer norm: before attention and before the MLP, the numbers are rescaled to a steady size so training stays stable.',
		`Stack: that block is repeated ${canonical.layers} times. Same design, different weights in each.`,
		`Out: a final layer norm, then a score for every token in the vocabulary, then softmax (${label('probability-and-sampling')}) gives next-token probabilities.`
	];

	const total = $derived(
		[p.embeddings, p.attention, p.mlp, p.layerNorms, p.blocks - p.block, p.output]
			.slice(0, s + 1)
			.reduce((a, b) => a + b, 0)
	);
</script>

<WidgetFrame
	title="Build a transformer"
	label="Step through"
	source={{ kind: 'computed' }}
	onreset={() => stepper.reset()}
>
	<div class="layout">
		<svg viewBox="0 0 340 470" role="img" aria-label="Diagram: {STEPS[s]}">
			<!-- stacked copies -->
			{#if s >= 4}
				{#each [3, 2, 1] as k (k)}
					<rect x={20 + k * 6} y={100 - k * 6} width="300" height="210" rx="8" class="copy" />
				{/each}
			{/if}
			{#if s >= 1}
				<rect x="20" y="100" width="300" height="210" rx="8" class="block" />
				<text x="308" y="120" class="small corner"
					>{s >= 4 ? `block 1 of ${canonical.layers}` : 'one block'}</text
				>
			{/if}

			<!-- the stream -->
			<line x1="90" y1="70" x2="90" y2={s >= 5 ? 360 : 330} class="stream" />
			<rect x="20" y="20" width="140" height="44" rx="6" class="box embed" />
			<text x="90" y="38" class="label">word vector</text>
			<text x="90" y="55" class="small">+ position vector</text>

			{#if s >= 1}
				<path d="M90 140 H200 V150" class="branch" />
				<rect x="160" y="150" width="140" height={s >= 3 ? 46 : 34} rx="6" class="box attn" />
				{#if s >= 3}<text x="230" y="166" class="small">layer norm</text>{/if}
				<text x="230" y={s >= 3 ? 186 : 172} class="label">attention</text>
				<path d="M230 {s >= 3 ? 196 : 184} V205 H102" class="branch" />
				<circle cx="90" cy="205" r="11" class="add" />
				<text x="90" y="210" class="plus">+</text>
			{/if}
			{#if s >= 2}
				<path d="M90 225 H200 V232" class="branch" />
				<rect x="160" y="232" width="140" height={s >= 3 ? 46 : 34} rx="6" class="box mlp" />
				{#if s >= 3}<text x="230" y="248" class="small">layer norm</text>{/if}
				<text x="230" y={s >= 3 ? 268 : 254} class="label">MLP ({n(canonical.mlpSize)})</text>
				<path d="M230 {s >= 3 ? 278 : 266} V288 H102" class="branch" />
				<circle cx="90" cy="288" r="11" class="add" />
				<text x="90" y="293" class="plus">+</text>
			{/if}
			{#if s >= 4}
				<text x="310" y="330" class="label end">× {canonical.layers}</text>
			{/if}
			{#if s >= 5}
				<rect x="20" y="360" width="300" height="44" rx="6" class="box out" />
				<text x="170" y="378" class="label">layer norm → vocabulary scores</text>
				<text x="170" y="395" class="small">{n(canonical.vocabularySize)} scores → softmax</text>
				<line x1="170" y1="404" x2="170" y2="424" class="branch" />
				<text x="170" y="446" class="label">next-token probabilities</text>
			{/if}
		</svg>
		<dl class="count">
			<dt>Parameters so far</dt>
			<dd class="mono">{n(total)}</dd>
			{#if s >= 5}<dd class="small-print">
					= {canonical.displayName}’s {n(canonical.parameters)}
				</dd>{/if}
		</dl>
	</div>
	<p class="explain">{STEPS[s]}</p>

	{#snippet controls()}
		<StepController {stepper} describe={(i) => STEPS[i]} />
	{/snippet}
</WidgetFrame>

<style>
	.layout {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: flex-start;
	}

	svg {
		width: 100%;
		max-width: 340px;
		height: auto;
		font-family: var(--font-sans);
	}

	.stream {
		stroke: var(--c-vector);
		stroke-width: 6;
		stroke-linecap: round;
	}

	.branch {
		fill: none;
		stroke: var(--ink-muted);
		stroke-width: 1.5;
	}

	.box {
		stroke-width: 1.5;
	}

	.embed {
		fill: var(--c-vector-tint);
		stroke: var(--c-vector);
	}

	.attn {
		fill: var(--c-attention-tint);
		stroke: var(--c-attention);
	}

	.mlp {
		fill: var(--c-weight-tint);
		stroke: var(--c-weight);
	}

	.out {
		fill: var(--c-prob-tint);
		stroke: var(--c-prob);
	}

	.block,
	.copy {
		fill: var(--surface);
		stroke: var(--rule);
		stroke-width: 1.5;
	}

	.copy {
		fill: var(--surface-2);
	}

	.add {
		fill: var(--surface);
		stroke: var(--c-vector);
		stroke-width: 2;
	}

	.plus {
		text-anchor: middle;
		font-weight: 700;
		fill: var(--c-vector-ink);
	}

	.label,
	.small {
		text-anchor: middle;
		fill: var(--ink);
		font-size: 13px;
	}

	.label.end {
		text-anchor: end;
		font-weight: 700;
		font-size: 16px;
	}

	.small {
		font-size: 11px;
		fill: var(--ink-muted);
	}

	.small.corner {
		text-anchor: end;
	}

	.count {
		margin: 0;
		font-family: var(--font-sans);
	}

	.count dt {
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.count dd {
		margin: 0;
		font-size: 1.4rem;
	}

	.count .small-print {
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-4) 0 0;
	}
</style>
