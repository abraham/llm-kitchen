<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import { formatCount, kaplanLoss } from './data.ts';
	import { GPT2_FAMILY, nonEmbeddingParameters } from '#lib/math/transformer.ts';

	const W = 560;
	const H = 300;
	const PAD = { left: 52, right: 16, top: 16, bottom: 44 };
	const X0 = 3;
	const X1 = 12;
	const FIT_MIN = 768;
	const FIT_MAX = 1.5e9;
	const Y0 = 1.25;
	const Y1 = 7;

	const sx = (n: number) =>
		PAD.left + ((Math.log10(n) - X0) / (X1 - X0)) * (W - PAD.left - PAD.right);
	const sy = (l: number) => PAD.top + ((Y1 - l) / (Y1 - Y0)) * (H - PAD.top - PAD.bottom);
	const path = (from: number, to: number) => {
		const pts: string[] = [];
		for (let e = Math.log10(from); e <= Math.log10(to) + 1e-9; e += 0.05) {
			pts.push(`${sx(10 ** e).toFixed(1)},${sy(kaplanLoss(10 ** e)).toFixed(1)}`);
		}
		return `M${pts.join('L')}`;
	};

	const START = 6;
	let exponent = $state(START);
	const id = $props.id();
	const n = $derived(10 ** exponent);
	const loss = $derived(kaplanLoss(n));
	const ticks = Array.from({ length: X1 - X0 + 1 }, (_, i) => X0 + i);
	const lossTicks = [2, 3, 4, 5, 6, 7];
	// The label reserves room for its longest value, so the slider after it stays put.
	const widest = Math.max(
		...Array.from(
			{ length: (X1 - X0) / 0.05 + 1 },
			(_, i) => formatCount(10 ** (X0 + i * 0.05)).length
		)
	);
</script>

<WidgetFrame
	title="The scaling curve"
	source={{ kind: 'computed' }}
	onreset={() => (exponent = START)}
>
	<svg
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label="Predicted loss falls along a smooth curve as the number of weights grows from a thousand to a trillion."
	>
		{#each ticks as t (t)}
			<line x1={sx(10 ** t)} x2={sx(10 ** t)} y1={PAD.top} y2={H - PAD.bottom} class="grid" />
			<text x={sx(10 ** t)} y={H - PAD.bottom + 16} class="tick"
				>10{String(t).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}</text
			>
		{/each}
		{#each lossTicks as l (l)}
			<line x1={PAD.left} x2={W - PAD.right} y1={sy(l)} y2={sy(l)} class="grid" />
			<text x={PAD.left - 8} y={sy(l) + 4} class="tick y">{l}</text>
		{/each}
		<text x={(PAD.left + W - PAD.right) / 2} y={H - 6} class="axis"
			>Weights, not counting the token tables (log scale)</text
		>
		<text
			x={14}
			y={(PAD.top + H - PAD.bottom) / 2}
			class="axis"
			transform="rotate(-90 14 {(PAD.top + H - PAD.bottom) / 2})">Loss</text
		>

		<path d={path(10 ** X0, FIT_MIN)} class="curve extrapolated" />
		<path d={path(FIT_MIN, FIT_MAX)} class="curve" />
		<path d={path(FIT_MAX, 10 ** X1)} class="curve extrapolated" />

		{#each GPT2_FAMILY as m (m.name)}
			{@const ne = nonEmbeddingParameters(m)}
			<circle cx={sx(ne)} cy={sy(kaplanLoss(ne))} r="4" class="model" />
		{/each}
		<text
			x={sx(nonEmbeddingParameters(GPT2_FAMILY[1]))}
			y={sy(kaplanLoss(nonEmbeddingParameters(GPT2_FAMILY[1]))) - 14}
			class="tick">GPT-2 sizes</text
		>

		<line x1={sx(n)} x2={sx(n)} y1={PAD.top} y2={H - PAD.bottom} class="cursor" />
		<circle cx={sx(n)} cy={sy(loss)} r="6" class="you" />
	</svg>

	<div class="slider">
		<label for="{id}-n" class="label"
			>Weights: <span class="mono value" style:min-width="{widest}ch">{formatCount(n)}</span></label
		>
		<input id="{id}-n" type="range" min={X0} max={X1} step="0.05" bind:value={exponent} />
	</div>
	<p class="readout" aria-live="polite">
		Predicted loss: <strong class="mono">{loss.toFixed(2)}</strong>. On average, the right next
		token gets a probability of about <strong>{formatPercent(Math.exp(-loss))}</strong>.
		{#if n < FIT_MIN || n > FIT_MAX}
			<em>This size is outside the range the formula was fitted on (dashed), so it's a guess.</em>
		{/if}
	</p>
	<p class="note">
		Formula from Kaplan et al. (2020), for models trained on plenty of text. Dots mark the four
		GPT-2 sizes on the formula's line, not their measured results.
	</p>
</WidgetFrame>

<style>
	svg {
		width: 100%;
		height: auto;
		font-family: var(--font-sans);
	}

	.grid {
		stroke: var(--rule);
	}

	.tick {
		font-size: 11px;
		fill: var(--ink-muted);
		text-anchor: middle;
	}

	.tick.y {
		text-anchor: end;
	}

	.axis {
		font-size: 12px;
		fill: var(--ink);
		text-anchor: middle;
	}

	.curve {
		fill: none;
		stroke: var(--c-loss);
		stroke-width: 2.5;
	}

	.curve.extrapolated {
		stroke-dasharray: 5 4;
		stroke-width: 1.5;
	}

	.model {
		fill: var(--surface);
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.cursor {
		stroke: var(--ink-muted);
		stroke-dasharray: 2 3;
	}

	.you {
		fill: var(--c-loss);
	}

	.slider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-2);
	}

	input[type='range'] {
		accent-color: var(--c-loss);
		min-width: 14rem;
	}

	.value {
		display: inline-block;
		/* The label's tracking would make each character wider than 1ch. */
		letter-spacing: normal;
	}

	.readout {
		margin: var(--space-3) 0 0;
		min-height: 3em;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
