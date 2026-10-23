<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';

	const data = useDataset('prompts/fragile');
	const id = $props.id();
	let tab = $state<'order' | 'format' | 'position'>('order');
	const TABS = [
		['order', 'Example order'],
		['format', 'Formatting'],
		['position', 'Position in a long prompt']
	] as const;

	const W = 420;
	const H = 180;
	const P = 30;
</script>

<WidgetFrame
	title="Small changes, different answers"
	source={{ kind: 'recorded', model: 'GPT-2 small and Qwen2.5-1.5B-Instruct' }}
	onreset={() => (tab = 'order')}
>
	<fieldset>
		<legend class="label">Change</legend>
		{#each TABS as [value, name] (value)}
			<label><input type="radio" name="{id}-tab" {value} bind:group={tab} /> {name}</label>
		{/each}
	</fieldset>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const s = d.sentiment}
			{@const n = s.tests.length}
			{#if tab === 'order'}
				{@const counts = Array.from(
					{ length: n + 1 },
					(_, k) => s.orders.filter((o) => o.correct === k).length
				)}
				<p>
					GPT-2 small labels {n} reviews as positive or negative, after the same {s.examples.length} examples
					in each of their {s.orders.length} possible orders.
				</p>
				<table>
					<caption>How many orders gave each score</caption>
					<thead>
						<tr><th scope="col">Reviews right</th><th scope="col">Orders</th></tr>
					</thead>
					<tbody>
						{#each counts as c, k (k)}
							{#if c}
								<tr>
									<th scope="row">{k} of {n}</th>
									<td><span class="bar" style:width="{(c / s.orders.length) * 100}%"></span> {c}</td
									>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			{:else if tab === 'format'}
				<p>
					The same {s.examples.length} examples and {n} reviews for GPT-2 small, laid out four ways.
				</p>
				<table>
					<caption>Reviews labeled right, by layout</caption>
					<thead>
						<tr><th scope="col">Layout</th><th scope="col">Right</th></tr>
					</thead>
					<tbody>
						{#each s.formats as f (f.name)}
							<tr>
								<th scope="row"><code>{f.example.trim().replaceAll('\n', ' ↵ ')}</code></th>
								<td
									><span class="bar" style:width="{(f.correct / n) * 100}%"></span>
									{f.correct} of {n}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				{@const pos = d.position}
				{@const sx = (x: number) => P + (x / (pos.facts - 1)) * (W - P - 10)}
				{@const sy = (y: number) => 10 + (1 - y) * (H - P - 10)}
				{@const avg = pos.positions.map((x, i) => ({
					x,
					p: pos.runs.reduce((a, r) => a + r.points[i].p, 0) / pos.runs.length
				}))}
				{@const misses = pos.runs.flatMap((r) => r.points.filter((pt) => pt.p < 0.5))}
				<p>
					Qwen2.5-1.5B-Instruct reads {pos.facts} lines, each giving one person's locker number, and is
					asked for one person's number. The line it needs moves from first to last. Each dot is one of
					{pos.runs.length}
					people; the line is their average.
				</p>
				<svg
					viewBox="0 0 {W} {H}"
					role="img"
					aria-label="Chance of the right number by where the line sits. {misses.length} misses, all with the line somewhere in the middle; none when it was first or last."
				>
					<line x1={P} y1={sy(0)} x2={W - 10} y2={sy(0)} class="axis" />
					<line x1={P} y1={sy(0)} x2={P} y2={sy(1)} class="axis" />
					<text x={P - 4} y={sy(1)} class="tick end">100%</text>
					<text x={P - 4} y={sy(0)} class="tick end">0%</text>
					<text x={sx(0)} y={H - 6} class="tick">first line</text>
					<text x={sx(pos.facts - 1)} y={H - 6} class="tick end">last line</text>
					{#each pos.runs as r (r.name)}
						{#each r.points as pt (pt.position)}
							<circle
								cx={sx(pt.position)}
								cy={sy(pt.p)}
								r="3"
								class="dot"
								class:miss={pt.p < 0.5}
							/>
						{/each}
					{/each}
					<path
						d={avg.map((a, i) => `${i ? 'L' : 'M'} ${sx(a.x)} ${sy(a.p)}`).join(' ')}
						class="avg"
					/>
				</svg>
				<p class="readout">
					{misses.length} of {pos.runs.length * pos.positions.length} answers went wrong, every one with
					the line somewhere in the middle. Average chance of the right number: {formatPercent(
						avg[0].p
					)} when it was first, {formatPercent(avg.at(-1)!.p)} when it was last.
				</p>
			{/if}
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	fieldset {
		border: 0;
		margin: 0 0 var(--space-3);
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		width: 100%;
		padding: 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	caption {
		text-align: left;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin-bottom: var(--space-1);
	}

	th,
	td {
		padding: 3px var(--space-2);
		border-bottom: 1px solid var(--rule);
		text-align: left;
		font-weight: 400;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		color: var(--ink-muted);
	}

	td {
		width: 60%;
	}

	code {
		font-size: 0.8rem;
		overflow-wrap: anywhere;
	}

	.bar {
		display: inline-block;
		height: 0.7rem;
		max-width: 80%;
		background: var(--c-prob);
		border-radius: 2px;
		vertical-align: middle;
	}

	svg {
		display: block;
		width: 100%;
		max-width: 32rem;
		height: auto;
		font-family: var(--font-sans);
	}

	.axis {
		stroke: var(--rule);
	}

	.tick {
		font-size: 10px;
		fill: var(--ink-muted);
	}

	.end {
		text-anchor: end;
	}

	.dot {
		fill: var(--c-prob);
		opacity: 0.45;
	}

	.dot.miss {
		fill: var(--c-loss);
		opacity: 1;
	}

	.avg {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2;
	}

	.readout {
		margin: var(--space-2) 0 0;
	}
</style>
