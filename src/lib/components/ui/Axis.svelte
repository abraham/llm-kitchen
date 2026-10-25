<script lang="ts">
	import type { Scale } from '#lib/math/scale.ts';

	let {
		scale,
		side,
		at,
		ticks,
		count = 5,
		format = String,
		grid,
		line = false,
		label,
		labelAt
	}: {
		scale: Scale;
		side: 'bottom' | 'left';
		/** Where the axis sits on the other axis: a y for `bottom`, an x for `left`. */
		at: number;
		/** Tick values; by default about `count` from the scale. */
		ticks?: readonly number[];
		count?: number;
		format?: (value: number) => string;
		/** Draw gridlines across the plot, to this coordinate on the other axis. */
		grid?: number;
		/** Draw the axis line along the scale's range. */
		line?: boolean;
		/** The axis title, centered under (or rotated beside) the axis. */
		label?: string;
		/** Where the title sits: a y for `bottom` (default 34px below), an x for `left` (default 40px left). */
		labelAt?: number;
	} = $props();

	const values = $derived(ticks ?? scale.ticks(count));
	const [r0, r1] = $derived(scale.range);
	const middle = $derived((r0 + r1) / 2);
</script>

<g class="axis">
	{#if side === 'bottom'}
		{#if line}<line x1={r0} x2={r1} y1={at} y2={at} class="domain" />{/if}
		{#each values as v (v)}
			{@const p = scale(v)}
			{#if grid !== undefined}<line x1={p} x2={p} y1={grid} y2={at} class="grid" />{/if}
			<text x={p} y={at + 16} class="tick" text-anchor="middle">{format(v)}</text>
		{/each}
		{#if label}
			<text x={middle} y={labelAt ?? at + 34} class="title" text-anchor="middle">{label}</text>
		{/if}
	{:else}
		{#if line}<line x1={at} x2={at} y1={r0} y2={r1} class="domain" />{/if}
		{#each values as v (v)}
			{@const p = scale(v)}
			{#if grid !== undefined}<line x1={at} x2={grid} y1={p} y2={p} class="grid" />{/if}
			<text x={at - 6} y={p} class="tick" text-anchor="end" dominant-baseline="middle"
				>{format(v)}</text
			>
		{/each}
		{#if label}
			{@const x = labelAt ?? at - 40}
			<text {x} y={middle} class="title" text-anchor="middle" transform="rotate(-90 {x} {middle})"
				>{label}</text
			>
		{/if}
	{/if}
</g>

<style>
	.domain {
		stroke: var(--ink-muted);
	}

	.grid {
		stroke: var(--rule);
	}

	.tick {
		font-size: max(11px, var(--min-text, 11px));
		fill: var(--ink-muted);
	}

	.title {
		font-size: max(12px, var(--min-text, 11px));
		fill: var(--ink);
	}
</style>
