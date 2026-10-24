<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';

	const data = useDataset('encoders/fill-mask');
	let mode = $state<'decoder' | 'encoder'>('decoder');

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
	<Choice
		legend="Attention mask"
		options={[
			{ value: 'decoder', label: 'GPT-2 (decoder): earlier tokens only' },
			{ value: 'encoder', label: 'BERT (encoder): every token' }
		] as const}
		bind:value={mode}
	/>
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
