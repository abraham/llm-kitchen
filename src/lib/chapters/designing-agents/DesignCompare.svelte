<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import { DESIGN_SIZES, designCost, type Design } from '#lib/harness/designs.ts';

	const DEFAULT = 2;
	let steps = $state(DEFAULT);

	const DESIGNS: { key: Design; label: string }[] = [
		{ key: 'loop', label: 'Step by step' },
		{ key: 'code', label: 'Tools as code' },
		{ key: 'plan', label: 'Plan first' }
	];
	const rows = $derived(DESIGNS.map((d) => ({ ...d, ...designCost(d.key, steps) })));
	// Fixed scale (the loop's most at 6 steps), so the bars grow as the slider moves.
	const MOST = designCost('loop', 6).read;

	const MAX_W = 576;
	let W = $state(MAX_W);
	const LEFT = 104;
	const RIGHT = 56;
	const BAR = 22;
	const GAP = 10;
	const H = DESIGNS.length * (BAR + GAP);
	const yes = (b: boolean) => (b ? 'Yes' : 'No');
</script>

<WidgetFrame
	title="Three ways to run one task"
	source={{ kind: 'sample' }}
	onreset={() => (steps = DEFAULT)}
>
	<Slider label="Tool calls the task needs" min={1} max={6} bind:value={steps} />

	<figure class="chart">
		<figcaption>Tokens read in all, across every model call</figcaption>
		<Figure
			max={MAX_W}
			bind:width={W}
			height={H}
			label="With {steps} tool calls, step by step reads {formatCount(
				rows[0].read
			)} tokens, tools as code {formatCount(rows[1].read)}, and plan first {formatCount(
				rows[2].read
			)}."
		>
			{#each rows as r, i (r.key)}
				{@const y = i * (BAR + GAP)}
				{@const w = Math.max(2, ((W - LEFT - RIGHT) * r.read) / MOST)}
				<text
					class="label"
					x={LEFT - 8}
					y={y + BAR / 2}
					text-anchor="end"
					dominant-baseline="central">{r.label}</text
				>
				<rect class="bar" x={LEFT} {y} width={w} height={BAR} />
				<text class="value" x={LEFT + w + 6} y={y + BAR / 2} dominant-baseline="central"
					>{formatCount(r.read)}</text
				>
			{/each}
		</Figure>
	</figure>

	<table class="data">
		<caption>The same task, three ways</caption>
		<thead>
			<tr>
				<th scope="col"><span class="visually-hidden">Measure</span></th>
				{#each rows as r (r.key)}<th scope="col" class="num">{r.label}</th>{/each}
			</tr>
		</thead>
		<tbody aria-live="polite">
			<tr>
				<th scope="row">Model calls</th>
				{#each rows as r (r.key)}<td>{r.calls}</td>{/each}
			</tr>
			<tr>
				<th scope="row">Tokens read in all</th>
				{#each rows as r (r.key)}<td>{formatCount(r.read)}</td>{/each}
			</tr>
			<tr>
				<th scope="row">Sees each result before the next step</th>
				{#each rows as r (r.key)}<td>{yes(r.seesEachResult)}</td>{/each}
			</tr>
			<tr>
				<th scope="row">Runs code the model wrote</th>
				{#each rows as r (r.key)}<td>{yes(r.runsModelCode)}</td>{/each}
			</tr>
		</tbody>
	</table>
	<p class="note">
		Made-up sizes, close to the run in the agent loop: {DESIGN_SIZES.start} tokens to start and
		{DESIGN_SIZES.toolResult} more per tool result; a program and what it prints add {DESIGN_SIZES.program}.
	</p>
</WidgetFrame>

<style>
	.chart {
		margin: var(--space-3) 0 var(--space-2);
	}

	figcaption,
	.note {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.label,
	.value {
		font-family: var(--font-sans);
		font-size: 12px;
		fill: var(--ink);
	}

	/* Every bar is prompt tokens, so token amber. */
	.bar {
		fill: var(--c-token);
	}

	table {
		max-width: 34rem;
	}
</style>
