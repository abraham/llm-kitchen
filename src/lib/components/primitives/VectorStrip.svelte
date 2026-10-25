<script lang="ts">
	import { entrance } from '../ui/entrance.ts';

	let {
		values,
		cells = 48,
		label,
		scale: fixedScale
	}: {
		values: number[];
		/** How many of the numbers to draw; the rest are summarized. */
		cells?: number;
		label: string;
		/** Size that gets full color (larger ones are capped). Defaults to the largest shown. */
		scale?: number;
	} = $props();

	const shown = $derived(values.slice(0, cells));
	const scale = $derived(fixedScale ?? Math.max(...shown.map(Math.abs), 1e-9));
	const fmt = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
</script>

<span
	class="strip"
	{@attach entrance()}
	role="img"
	aria-label="{label}: a list of {values.length} numbers, starting {shown
		.slice(0, 4)
		.map(fmt)
		.join(', ')}"
>
	{#each shown as v, i (i)}
		<span
			class="cell"
			data-enter="fade"
			class:negative={v < 0}
			style:--strength={Math.round(Math.min(Math.abs(v) / scale, 1) * 100)}
			title="#{i + 1}: {fmt(v)}"
		></span>
	{/each}
	{#if values.length > cells}
		<span class="more mono">+{values.length - cells}</span>
	{/if}
</span>

<style>
	.strip {
		display: inline-flex;
		align-items: center;
		gap: 1px;
		padding: 2px;
		border: 1.5px solid var(--c-vector);
		border-radius: 3px;
		background: var(--surface);
		vertical-align: middle;
	}

	.cell {
		width: 5px;
		height: 18px;
		background: color-mix(in oklch, var(--c-vector) calc(var(--strength) * 1%), var(--surface));
	}

	/* Negative numbers are striped, so the sign doesn't depend on color alone. */
	.cell.negative {
		background: repeating-linear-gradient(
			45deg,
			color-mix(in oklch, var(--c-vector) calc(var(--strength) * 1%), var(--surface)) 0 2px,
			var(--surface) 2px 3px
		);
	}

	.more {
		font-size: 0.7rem;
		color: var(--c-vector-ink);
		padding-left: 4px;
	}
</style>
