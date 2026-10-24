<script lang="ts">
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Choice, { type Option } from '#lib/components/ui/Choice.svelte';
	import AttentionLines from '#lib/components/primitives/AttentionLines.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { useDatasets } from '#lib/datasets/use.ts';
	import type { TraceName } from '#lib/datasets/registry.ts';
	import { canonical } from '#lib/models/provider.ts';

	type Which = number | 'avg';
	interface Prompt {
		name: TraceName;
		label: string;
		layer: Which;
		head: Which;
		/** The token that starts selected; defaults to the last one. */
		focus?: string;
	}

	const PROMPTS: Prompt[] = [
		{
			name: 'attn-ioi',
			label: 'When Mary and John went to the store, John gave a drink to',
			layer: 9,
			head: 9
		},
		{
			name: 'attn-mary-lamb',
			label: 'Mary had a little lamb, its fleece was white as snow',
			layer: 9,
			head: 0,
			focus: ' its'
		},
		{
			name: 'attn-trophy-big',
			label: "The trophy didn't fit in the suitcase because it was too big",
			layer: 9,
			head: 0,
			focus: ' it'
		},
		{
			name: 'attn-trophy-small',
			label: "The trophy didn't fit in the suitcase because it was too small",
			layer: 9,
			head: 0,
			focus: ' it'
		},
		{ name: 'attn-the-cat-sat', label: 'The cat sat on the', layer: 'avg', head: 'avg' }
	];

	let prompt = $state(PROMPTS[0]);
	let layer = $state<Which>(PROMPTS[0].layer);
	let head = $state<Which>(PROMPTS[0].head);
	let query = $state<number | null>(null);

	const datasets = useDatasets();
	const trace = $derived(datasets(`traces/${prompt.name}`));

	function choose(name: string) {
		const p = PROMPTS.find((x) => x.name === name)!;
		prompt = p;
		layer = p.layer;
		head = p.head;
		query = null;
	}

	function average(matrices: number[][][]): number[][] {
		return matrices[0].map((row, q) =>
			row.map((_, k) => matrices.reduce((a, m) => a + m[q][k], 0) / matrices.length)
		);
	}

	function pick(weights: number[][][][]): number[][] {
		const layers = layer === 'avg' ? weights : [weights[layer]];
		const heads = layers.flatMap((l) => (head === 'avg' ? l : [l[head as number]]));
		return heads.length === 1 ? heads[0] : average(heads);
	}

	const layers = Array.from({ length: canonical.layers }, (_, i) => i);
	const heads = Array.from({ length: canonical.heads }, (_, i) => i);
	const averageOr = (xs: number[]): Option<Which>[] => [
		{ value: 'avg', label: 'all (average)' },
		...xs.map((x) => ({ value: x, label: String(x) }))
	];
</script>

<WidgetFrame
	title="Who looks at whom"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => choose(PROMPTS[0].name)}
>
	<div class="controls">
		<div class="wide">
			<Choice
				legend="Sentence"
				appearance="select"
				options={PROMPTS.map((p) => ({ value: p.name, label: p.label }))}
				bind:value={() => prompt.name, choose}
			/>
		</div>
		<Choice legend="Layer" appearance="select" options={averageOr(layers)} bind:value={layer} />
		<Choice legend="Head" appearance="select" options={averageOr(heads)} bind:value={head} />
	</div>

	<Loading promise={trace}>
		{#snippet children(t)}
			{@const tokens = t.attention!.tokens.map((x) => x.text)}
			{@const weights = pick(t.attention!.weights)}
			{@const focus = prompt.focus ? tokens.indexOf(prompt.focus) : -1}
			{@const q = Math.min(query ?? (focus >= 0 ? focus : tokens.length - 1), tokens.length - 1)}
			{@const top = weights[q]
				.map((w, k) => ({ k, w }))
				.filter((x) => x.k <= q)
				.sort((a, b) => b.w - a.w)
				.slice(0, 3)}
			<div class="stage">
				<AttentionLines {tokens} {weights} query={q} onselect={(i) => (query = i)} />
			</div>
			<Status>
				{#if layer === 'avg' || head === 'avg'}Averaged over {layer === 'avg'
						? 'all layers'
						: `layer ${layer}`}{head === 'avg' ? ', all heads' : `, head ${head}`}:{:else}Layer {layer},
					head {head}:{/if}
				“{displayToken(tokens[q])}” looks most at
				{#each top as x, i (x.k)}<strong class="mono">{displayToken(tokens[x.k])}</strong>
					({formatPercent(x.w)}){i < top.length - 1 ? ', ' : '.'}{/each}
			</Status>
			<p class="note">
				Click a word on the right to see what it looks at. A word can only look back at itself and
				earlier words. Layers and heads are numbered from 0, as in research papers.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
		--block-space: 0;
	}

	.wide {
		flex: 1;
		min-width: 16rem;
	}

	.stage {
		overflow-x: auto;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: 0;
	}
</style>
