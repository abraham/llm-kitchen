<script lang="ts">
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { useDataset } from '#lib/datasets/use.ts';
	import { maskFuture, softmaxRows } from '#lib/math/attention.ts';
	import { canonical } from '#lib/models/provider.ts';

	type Step = 'scores' | 'masked' | 'weights';
	const STEPS: { value: Step; label: string }[] = [
		{ value: 'scores', label: 'Scores' },
		{ value: 'masked', label: 'Masked' },
		{ value: 'weights', label: 'Weights (softmax)' }
	];
	const START = { step: 'scores' as Step, layer: 9, head: 9 };
	const HEADS = canonical.heads;
	const TOTAL = canonical.layers * HEADS;

	const data = useDataset('attention/ioi-scores');
	let step = $state<Step>(START.step);
	let layer = $state(START.layer);
	let head = $state(START.head);
	let row = $state<number | null>(null);

	const index = $derived(layer * HEADS + head);
	function go(delta: number) {
		const i = (index + delta + TOTAL) % TOTAL;
		layer = Math.floor(i / HEADS);
		head = i % HEADS;
	}
	function reset() {
		step = START.step;
		layer = START.layer;
		head = START.head;
		row = null;
	}

	const numbers = Array.from({ length: HEADS }, (_, i) => ({ value: i, label: String(i) }));
	const CELL = 24;
	const LEFT = 64;
	const TOP = 64;
	const fixed = (v: number) => v.toFixed(2).replace('-', '−');
</script>

<WidgetFrame
	title="One head, step by step"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={reset}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const tokens = d.tokens.map((t) => displayToken(t.text))}
			{@const n = tokens.length}
			{@const q = row ?? n - 1}
			{@const scores = d.scores[layer][head]}
			{@const masked = maskFuture(scores)}
			{@const weights = softmaxRows(masked)}
			{@const flat = scores.flat()}
			{@const lo = Math.min(...flat)}
			{@const hi = Math.max(...flat)}
			{@const size = LEFT + n * CELL + 4}
			{@const top = weights[q]
				.map((w, k) => ({ k, w }))
				.sort((a, b) => b.w - a.w)
				.slice(0, 2)}
			<div class="controls">
				<Choice legend="Step" options={STEPS} bind:value={step} />
				<div class="heads">
					<Choice legend="Layer" appearance="select" options={numbers} bind:value={layer} />
					<Choice legend="Head" appearance="select" options={numbers} bind:value={head} />
					<button type="button" onclick={() => go(-1)}>Previous head</button>
					<button type="button" onclick={() => go(1)}>Next head</button>
					<span class="count mono">{index + 1} of {TOTAL}</span>
				</div>
				<Choice
					legend="Row: the word looking"
					appearance="select"
					options={tokens.map((t, i) => ({ value: i, label: t }))}
					bind:value={() => q, (v) => (row = v)}
				/>
			</div>

			<Figure
				viewBox={[size, size]}
				maxWidth="30rem"
				label="Head {layer}.{head}, {STEPS.find(
					(s) => s.value === step
				)!.label.toLowerCase()}: a grid of {n} rows (the word looking) by {n} columns (the word looked at). Row “{tokens[
					q
				]}” puts most weight on “{tokens[top[0].k]}”."
			>
				{#each tokens as t, i (i)}
					<text
						class="label"
						class:on={i === q}
						x={LEFT - 6}
						y={TOP + i * CELL + CELL / 2}
						text-anchor="end"
						dominant-baseline="central">{t}</text
					>
					<text
						class="label"
						x={LEFT + i * CELL + CELL / 2}
						y={TOP - 6}
						transform="rotate(-60 {LEFT + i * CELL + CELL / 2} {TOP - 6})">{t}</text
					>
				{/each}
				{#each scores as cells, r (r)}
					{#each cells as score, k (k)}
						{@const hidden = step !== 'scores' && k > r}
						<rect
							class="cell"
							class:hidden
							x={LEFT + k * CELL}
							y={TOP + r * CELL}
							width={CELL - 1}
							height={CELL - 1}
							fill-opacity={hidden
								? 1
								: step === 'weights'
									? weights[r][k]
									: (score - lo) / (hi - lo)}
						/>
						{#if hidden && step === 'masked'}
							<text
								class="inf"
								x={LEFT + k * CELL + CELL / 2}
								y={TOP + r * CELL + CELL / 2}
								text-anchor="middle"
								dominant-baseline="central">−∞</text
							>
						{/if}
					{/each}
				{/each}
				<rect
					class="row"
					x={LEFT - 1}
					y={TOP + q * CELL - 1}
					width={n * CELL + 1}
					height={CELL + 1}
				/>
			</Figure>

			<Status>
				Head {layer}.{head}: after softmax, “{tokens[q]}” puts {formatPercent(top[0].w)} on “{tokens[
					top[0].k
				]}” and {formatPercent(top[1].w)} on “{tokens[top[1].k]}”.
			</Status>

			<details class="numbers">
				<summary>Row “{tokens[q]}” in numbers</summary>
				<table class="data">
					<caption>Each earlier word’s score, after the mask, and weight</caption>
					<thead>
						<tr>
							<th scope="col">Looked at</th>
							<th scope="col" class="num">Score</th>
							<th scope="col" class="num">Masked</th>
							<th scope="col" class="num">Weight</th>
						</tr>
					</thead>
					<tbody>
						{#each tokens as t, k (k)}
							<tr>
								<th scope="row" class="mono">{t}</th>
								<td>{fixed(scores[q][k])}</td>
								<td>{masked[q][k] === null ? '−∞' : fixed(scores[q][k])}</td>
								<td>{formatPercent(weights[q][k])}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</details>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.controls {
		--block-space: 0;
		display: grid;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.heads {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}

	.heads button {
		font: inherit;
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.count {
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.label {
		font-family: var(--font-mono);
		font-size: max(12px, var(--min-text));
		fill: var(--ink-muted);
	}

	.label.on {
		fill: var(--ink);
		font-weight: 600;
	}

	/* Attention is pink; how strong the pink is shows the number. */
	.cell {
		fill: var(--c-attention);
	}

	.cell.hidden {
		fill: var(--surface-2);
	}

	.inf {
		font-family: var(--font-sans);
		font-size: max(12px, var(--min-text));
		fill: var(--ink-muted);
	}

	.row {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
	}

	.numbers {
		margin-top: var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.numbers table {
		max-width: 26rem;
		margin-top: var(--space-1);
	}
</style>
