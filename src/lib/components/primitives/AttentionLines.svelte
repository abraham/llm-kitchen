<script lang="ts">
	import { displayToken, formatPercent } from './format.ts';

	let {
		tokens,
		weights,
		query,
		onselect
	}: {
		tokens: string[];
		/** weights[q][k] for the selected head (or average). */
		weights: number[][];
		query: number;
		onselect: (index: number) => void;
	} = $props();

	const ROW = 26;
	/** Room for the clickable words on the right. */
	const BUTTONS = 130;
	let width = $state(560);
	const W = $derived(Math.max(200, Math.min(width, 560) - BUTTONS));
	const LEFT = $derived(Math.min(150, W * 0.42));
	const RIGHT = $derived(W - 6);
	const H = $derived(tokens.length * ROW + 8);
	const y = (i: number) => 4 + i * ROW + ROW / 2;
	const row = $derived(weights[query] ?? []);
	const top = $derived(
		row
			.map((w, k) => ({ k, w }))
			.filter((x) => x.k <= query)
			.sort((a, b) => b.w - a.w)
			.slice(0, 3)
	);
</script>

<div class="attention" bind:clientWidth={width}>
	<svg
		width={W}
		height={H}
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label="Attention from “{tokens[query].trim()}”: {top
			.map((t) => `${tokens[t.k].trim()} ${formatPercent(t.w)}`)
			.join(', ')}"
	>
		{#each row as w, k (k)}
			{#if k <= query && w > 0.005}
				<line
					x1={RIGHT}
					y1={y(query)}
					x2={LEFT}
					y2={y(k)}
					style:stroke-width={0.5 + w * 14}
					style:stroke-opacity={0.25 + w * 0.75}
					class="line"
				/>
			{/if}
		{/each}
		{#each tokens as t, i (i)}
			<text
				x={LEFT - 8}
				y={y(i)}
				class="key"
				class:dim={i > query}
				style:font-weight={i <= query && row[i] > 0.2 ? 700 : 400}>{displayToken(t)}</text
			>
		{/each}
	</svg>
	<ol
		class="queries"
		style:height="{H}px"
		style:left="{RIGHT + 6}px"
		aria-label="Pick the word that is looking"
	>
		{#each tokens as t, i (i)}
			<li style:top="{4 + i * ROW}px">
				<button type="button" aria-pressed={i === query} onclick={() => onselect(i)}
					>{displayToken(t)}</button
				>
			</li>
		{/each}
	</ol>
</div>

<style>
	.attention {
		position: relative;
		max-width: 560px;
	}

	svg {
		display: block;
		font-family: var(--font-mono);
		font-size: 13px;
	}

	.line {
		stroke: var(--c-attention);
		stroke-linecap: round;
		transition:
			stroke-width var(--duration) var(--ease),
			stroke-opacity var(--duration) var(--ease);
	}

	.key {
		text-anchor: end;
		dominant-baseline: middle;
		fill: var(--ink);
	}

	.key.dim {
		fill: var(--ink-muted);
		opacity: 0.6;
	}

	.queries {
		list-style: none;
		margin: 0;
		padding: 0;
		position: absolute;
		top: 0;
		right: 0;
	}

	.queries li {
		position: absolute;
		height: 26px;
		display: flex;
		align-items: center;
	}

	.queries button {
		font-family: var(--font-mono);
		font-size: 13px;
		min-height: 0;
		padding: 0 var(--space-2);
		line-height: 22px;
		border-radius: 999px;
		white-space: pre;
	}

	.queries button[aria-pressed='true'] {
		background: var(--c-attention-tint);
		border-color: var(--c-attention);
		color: var(--c-attention-ink);
		font-weight: 700;
	}
</style>
