<script lang="ts">
	import { onMount } from 'svelte';
	import { displayToken, formatPercent } from './format.ts';

	let {
		prompt,
		options,
		highlight
	}: {
		prompt: string;
		options: { label: string; p: number }[];
		/** Label to emphasize, e.g. the visitor's guess. */
		highlight?: string;
	} = $props();

	const ROW = 34;
	const height = $derived(Math.max(options.length * ROW, 120));
	const max = $derived(Math.max(...options.map((o) => o.p), 1e-9));
	const promptWidth = $derived(Math.min(9 * prompt.length + 60, 300));
	const fromX = $derived(promptWidth + 8);
	const toX = $derived(fromX + 170);

	let drawn = $state(false);
	onMount(() => {
		requestAnimationFrame(() => (drawn = true));
	});
</script>

<svg
	class="fan"
	class:drawn
	viewBox="0 0 {toX + 190} {height}"
	role="img"
	aria-label="{prompt} ___: {options
		.map((o) => `${o.label.trim()} ${formatPercent(o.p)}`)
		.join(', ')}"
>
	<text x="0" y={height / 2} class="prompt">{prompt} <tspan class="blank">___</tspan></text>
	{#each options as option, i (option.label)}
		{@const y = ROW / 2 + i * ROW}
		{@const isHighlight = highlight !== undefined && option.label === highlight}
		<path
			d="M {fromX} {height / 2} C {fromX + 80} {height / 2}, {toX - 80} {y}, {toX} {y}"
			pathLength="1"
			class="line"
			class:highlight={isHighlight}
			style:stroke-width={1 + (option.p / max) * 12}
			style:transition-delay="{i * 60}ms"
		/>
		<text x={toX + 8} {y} class="label" class:highlight={isHighlight}>
			{displayToken(option.label)}
			<tspan class="pct" dx="8">{formatPercent(option.p)}</tspan>
		</text>
	{/each}
</svg>

<style>
	.fan {
		width: 100%;
		height: auto;
		font-family: var(--font-mono);
		font-size: 15px;
		overflow: visible;
	}

	text {
		dominant-baseline: middle;
		fill: var(--ink);
	}

	.prompt {
		font-family: var(--font-serif);
		font-size: 17px;
	}

	.blank {
		fill: var(--c-token-ink);
		font-weight: 700;
	}

	.line {
		fill: none;
		stroke: var(--c-prob);
		stroke-opacity: 0.7;
		stroke-linecap: round;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		transition: stroke-dashoffset calc(var(--duration) * 2) var(--ease);
	}

	.drawn .line {
		stroke-dashoffset: 0;
	}

	.line.highlight {
		stroke: var(--c-token);
		stroke-opacity: 1;
	}

	.label.highlight {
		font-weight: 700;
		fill: var(--c-token-ink);
	}

	.pct {
		fill: var(--c-prob-ink);
		font-size: 13px;
	}
</style>
