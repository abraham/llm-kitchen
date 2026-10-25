<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Axis from '#lib/components/ui/Axis.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import { oneAgent, splitWork, totals, type Call } from '#lib/harness/delegation.ts';
	import { scaleLinear } from '#lib/math/scale.ts';

	const DEFAULT = { subtasks: 3, steps: 3 };
	let subtasks = $state(DEFAULT.subtasks);
	let steps = $state(DEFAULT.steps);

	const one = $derived(oneAgent({ subtasks, steps }));
	const split = $derived(splitWork({ subtasks, steps }));
	const a = $derived(totals(one));
	const b = $derived(totals(split));

	const MAX_W = 576;
	let W = $state(MAX_W);
	const H = 120;
	const LEFT = 44;
	const BOTTOM = 6;
	const TOP = 8;
	// Both charts share one scale, so their bars compare directly.
	const top = $derived(Math.max(a.largest, b.largest));
	const tickStep = $derived(top > 2000 ? 1000 : 500);
	const ticks = $derived(
		Array.from({ length: Math.floor(top / tickStep) + 1 }, (_, i) => i * tickStep)
	);
	const y = $derived(scaleLinear([0, top], [H - BOTTOM, TOP]));

	function bars(calls: readonly Call[]) {
		const slot = (W - LEFT - 4) / calls.length;
		return calls.map((c, i) => ({
			...c,
			x: LEFT + 4 + i * slot + slot * 0.12,
			width: Math.max(1, slot * 0.76),
			y: y(c.prompt),
			height: y(0) - y(c.prompt)
		}));
	}

	function reset() {
		subtasks = DEFAULT.subtasks;
		steps = DEFAULT.steps;
	}
</script>

{#snippet chart(title: string, calls: readonly Call[], label: string)}
	<figure class="chart">
		<figcaption>{title}</figcaption>
		<Figure max={MAX_W} bind:width={W} height={H} {label}>
			<Axis scale={y} side="left" at={LEFT} {ticks} format={(v) => formatCount(v)} grid={W - 4} />
			{#each bars(calls) as bar, i (i)}
				<rect class={bar.who} x={bar.x} y={bar.y} width={bar.width} height={bar.height} />
			{/each}
		</Figure>
	</figure>
{/snippet}

<WidgetFrame title="One agent or a lead with helpers" source={{ kind: 'sample' }} onreset={reset}>
	<div class="sliders">
		<Slider label="Subtasks" min={1} max={6} bind:value={subtasks} />
		<Slider label="Tool calls per subtask" min={1} max={5} bind:value={steps} />
	</div>

	<p class="legend" aria-hidden="true">
		<span><span class="key filled"></span>a call by the only agent, or by the lead</span>
		<span><span class="key helper"></span>a call by a helper</span>
	</p>
	{@render chart(
		'One agent',
		one,
		`One agent makes ${a.calls} calls; each prompt is longer than the last, up to ${formatCount(a.largest)} tokens.`
	)}
	{@render chart(
		'A lead and helpers',
		split,
		`The lead and ${subtasks} helpers make ${b.calls} calls; no prompt is over ${formatCount(b.largest)} tokens.`
	)}

	<table class="data">
		<caption>Tokens are the number of tokens each call's prompt has to read</caption>
		<thead>
			<tr>
				<th scope="col"><span class="visually-hidden">Measure</span></th>
				<th scope="col" class="num">One agent</th>
				<th scope="col" class="num">A lead and helpers</th>
			</tr>
		</thead>
		<tbody aria-live="polite">
			<tr>
				<th scope="row">Model calls</th>
				<td>{a.calls}</td>
				<td>{b.calls}</td>
			</tr>
			<tr>
				<th scope="row">Calls that wait for the one before</th>
				<td>{a.inARow}</td>
				<td>{b.inARow}</td>
			</tr>
			<tr>
				<th scope="row">Longest prompt</th>
				<td>{formatCount(a.largest)}</td>
				<td>{formatCount(b.largest)}</td>
			</tr>
			<tr>
				<th scope="row">Tokens read in all</th>
				<td>{formatCount(a.read)}</td>
				<td>{formatCount(b.read)}</td>
			</tr>
		</tbody>
	</table>
	<p class="note">
		Made-up sizes, close to the run in the agent loop: 300 tokens to start, 90 more per tool result,
		150 for a helper's first prompt, and 80 more for the lead per subtask. The helpers run at the
		same time.
	</p>
</WidgetFrame>

<style>
	.sliders {
		--block-space: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}

	.chart {
		margin: 0 0 var(--space-2);
	}

	figcaption,
	.legend,
	.note {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: 0 0 var(--space-1);
	}

	.key {
		display: inline-block;
		width: 0.9rem;
		height: 0.6rem;
		margin-right: var(--space-1);
		border: 1.5px solid var(--c-token);
	}

	/* Every bar is a prompt, so all are token amber: filled for the only agent or the lead, outlined for helpers. */
	rect.agent,
	rect.lead {
		fill: var(--c-token);
	}

	.key.filled {
		background: var(--c-token);
	}

	rect.helper {
		fill: var(--c-token-tint);
		stroke: var(--c-token);
		stroke-width: 1.5;
	}

	.key.helper {
		background: var(--c-token-tint);
	}

	table {
		max-width: 32rem;
		margin-top: var(--space-2);
	}
</style>
