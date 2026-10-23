<script lang="ts">
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
		width?: number;
		height?: number;
	} = $props();

	const PAD = 24;
	const max = $derived(Math.max(baseline ?? 0, ...values, 1e-9));
	const sx = (i: number, n: number) => PAD + (i / Math.max(n - 1, 1)) * (width - PAD - 4);
	const sy = (v: number) => 6 + (1 - v / max) * (height - PAD - 6);
	const path = $derived(
		values.map((v, i) => `${i ? 'L' : 'M'} ${sx(i, values.length)} ${sy(v)}`).join(' ')
	);
	const last = $derived(values.at(-1));
</script>

<svg
	viewBox="0 0 {width} {height}"
	class="loss-curve"
	role="img"
	aria-label="{label} over training: {values.length
		? `started at ${values[0].toFixed(2)}, now ${last!.toFixed(2)}`
		: 'no training yet'}"
>
	<line x1={PAD} y1={height - PAD} x2={width} y2={height - PAD} class="axis" />
	<line x1={PAD} y1="0" x2={PAD} y2={height - PAD} class="axis" />
	<text x={PAD - 4} y={sy(0)} class="tick end">0</text>
	<text x={PAD - 4} y={sy(max)} class="tick end">{max.toFixed(1)}</text>
	<text x={width - 2} y={height - 6} class="tick end">training steps →</text>
	{#if baseline !== undefined}
		<line x1={PAD} y1={sy(baseline)} x2={width} y2={sy(baseline)} class="baseline" />
		{#if baselineLabel}<text x={width - 2} y={sy(baseline) - 5} class="tick end"
				>{baselineLabel}</text
			>{/if}
	{/if}
	<path d={path} class="line" />
	{#if last !== undefined}
		<circle cx={sx(values.length - 1, values.length)} cy={sy(last)} r="3.5" class="dot" />
	{/if}
</svg>

<style>
	.loss-curve {
		width: 100%;
		height: auto;
		font-family: var(--font-sans);
		overflow: visible;
	}

	.axis {
		stroke: var(--rule);
	}

	.tick {
		font-size: 10px;
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
