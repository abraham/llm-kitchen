<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { loadJson } from '#lib/models/load-json.ts';
	import type { FillMaskData } from './FillTheBlank.svelte';

	const data = loadJson<FillMaskData>('encoders/fill-mask.json');
	let mode = $state<'decoder' | 'encoder'>('decoder');
	const id = $props.id();

	const CELL = 26;
	const LABEL = 64;
	const show = (t: string) => (t === '[MASK]' ? '___' : t);
	const sees = (row: number, col: number) => mode === 'encoder' || col <= row;
</script>

<WidgetFrame
	title="Who can look at whom"
	source={{ kind: 'computed' }}
	onreset={() => (mode = 'decoder')}
>
	<fieldset class="modes">
		<legend class="label">Attention mask</legend>
		<label
			><input type="radio" name="{id}-mode" value="decoder" bind:group={mode} /> GPT-2 (decoder): earlier
			tokens only</label
		>
		<label
			><input type="radio" name="{id}-mode" value="encoder" bind:group={mode} /> BERT (encoder): every
			token</label
		>
	</fieldset>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const tokens = d.sentences[0].tokens}
			{@const blank = tokens.indexOf('[MASK]')}
			{@const n = tokens.length}
			{@const visible = tokens.filter((_, j) => sees(blank, j)).length}
			<svg
				viewBox="0 0 {LABEL + n * CELL + 4} {LABEL + n * CELL + 4}"
				class="grid"
				role="img"
				aria-label="A grid of {n} by {n} tokens. Each row is a token; shaded cells are the tokens it can look at. {mode ===
				'decoder'
					? 'Only cells on or below the diagonal are shaded: each token sees itself and earlier tokens.'
					: 'Every cell is shaded: each token sees the whole sentence.'}"
			>
				{#each tokens as t, j (j)}
					<text
						x={LABEL + j * CELL + CELL / 2}
						y={LABEL - 6}
						class="col"
						class:hl={j === blank}
						transform="rotate(-50 {LABEL + j * CELL + CELL / 2} {LABEL - 6})">{show(t)}</text
					>
					<text x={LABEL - 6} y={LABEL + j * CELL + CELL / 2} class="row" class:hl={j === blank}
						>{show(t)}</text
					>
				{/each}
				{#each Array.from({ length: n }, (_, i) => i) as row (row)}
					{#each Array.from({ length: n }, (_, i) => i) as col (col)}
						<rect
							x={LABEL + col * CELL + 1}
							y={LABEL + row * CELL + 1}
							width={CELL - 2}
							height={CELL - 2}
							rx="3"
							class="cell"
							class:on={sees(row, col)}
							class:blank-row={row === blank}
						/>
					{/each}
				{/each}
			</svg>
			<p class="readout" aria-live="polite">
				Each row is a token; the shaded cells are the tokens it can look at. The blank can look at <strong
					>{visible} of {n}</strong
				>
				tokens{mode === 'decoder'
					? `: nothing after it, so “${tokens
							.slice(blank + 1)
							.filter((t) => /\w/.test(t))
							.join(' ')}” can't help.`
					: ', including the words after it.'}
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.modes {
		border: 0;
		margin: 0 0 var(--space-3);
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.modes legend {
		width: 100%;
		padding: 0;
	}

	.grid {
		display: block;
		width: 100%;
		max-width: 26rem;
		height: auto;
		margin: 0 auto;
		font-family: var(--font-mono);
	}

	text {
		font-size: 11px;
		fill: var(--ink-muted);
		dominant-baseline: middle;
	}

	.row {
		text-anchor: end;
	}

	.col {
		text-anchor: start;
	}

	text.hl {
		fill: var(--c-token-ink);
		font-weight: 700;
	}

	.cell {
		fill: var(--surface-2);
		stroke: var(--rule);
		transition: fill var(--duration) var(--ease);
	}

	.cell.on {
		fill: var(--c-attention-tint);
		stroke: var(--c-attention);
	}

	.cell.on.blank-row {
		fill: var(--c-attention);
	}

	.readout {
		margin: var(--space-3) 0 0;
		min-height: 3em;
	}
</style>
