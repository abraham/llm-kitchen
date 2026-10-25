<script lang="ts">
	import Figure from '../ui/Figure.svelte';
	import { scaleLinear } from '#lib/math/scale.ts';

	let {
		values,
		baseline,
		baselineLabel,
		label = 'Loss',
		width = 320,
		height = 140
	}: {
		values: number[];
		/** A horizontal reference line, e.g. the loss of guessing uniformly. */
		baseline?: number;
		baselineLabel?: string;
		label?: string;
		/** The width it draws at before the page hydrates; then it fills the room there is. */
		width?: number;
		height?: number;
	} = $props();

	const PAD = 24;
	// svelte-ignore state_referenced_locally
	let w = $state(width);
	const max = $derived(Math.max(baseline ?? 0, ...values, 1e-9));
	const sx = $derived(scaleLinear([0, Math.max(values.length - 1, 1)], [PAD, w - 4]));
	const sy = $derived(scaleLinear([0, max], [height - PAD, 6]));
	const path = $derived(values.map((v, i) => `${i ? 'L' : 'M'} ${sx(i)} ${sy(v)}`).join(' '));
	const last = $derived(values.at(-1));
</script>

<Figure
	bind:width={w}
	{height}
	overflow
	label="{label} over training: {values.length
		? `started at ${values[0].toFixed(2)}, now ${last!.toFixed(2)}`
		: 'no training yet'}"
>
	<line x1={PAD} y1={height - PAD} x2={w} y2={height - PAD} class="axis" />
	<line x1={PAD} y1="0" x2={PAD} y2={height - PAD} class="axis" />
	<text x={PAD - 4} y={sy(0)} class="tick end">0</text>
	<text x={PAD - 4} y={sy(max)} class="tick end">{max.toFixed(1)}</text>
	<text x={w - 2} y={height - 6} class="tick end">training steps →</text>
	{#if baseline !== undefined}
		<line x1={PAD} y1={sy(baseline)} x2={w} y2={sy(baseline)} class="baseline" />
		{#if baselineLabel}<text x={w - 2} y={sy(baseline) - 6} class="tick end">{baselineLabel}</text
			>{/if}
	{/if}
	<path d={path} class="line" />
	{#if last !== undefined}
		<circle cx={sx(values.length - 1)} cy={sy(last)} r="3.5" class="dot" />
	{/if}
</Figure>

<style>
	.axis {
		stroke: var(--rule);
	}

	.tick {
		font-size: 11px;
		fill: var(--ink-muted);
		dominant-baseline: middle;
	}

	.end {
		text-anchor: end;
	}

	.baseline {
		stroke: var(--ink-muted);
		stroke-dasharray: 4 3;
	}

	.line {
		fill: none;
		stroke: var(--c-loss);
		stroke-width: 2;
	}

	.dot {
		fill: var(--c-loss);
	}
</style>
