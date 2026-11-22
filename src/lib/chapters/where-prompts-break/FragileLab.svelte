<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import {
		describePromptDiffChunk,
		diffPromptLayouts,
		type PromptDiffChunk
	} from '#lib/math/prompt-diff.ts';
	import { scaleLinear } from '#lib/math/scale.ts';

	const data = useDataset('prompts/fragile');
	let tab = $state<'order' | 'format' | 'position'>('order');
	let compareFormat = $state(1);
	let pickedChunk = $state<{ fmt: number; index: number } | null>(null);
	const TABS = [
		['order', 'Example order'],
		['format', 'Formatting'],
		['position', 'Position in a long prompt']
	] as const;

	const MAX_W = 512;
	let W = $state(MAX_W);
	const H = 180;
	const P = 36;

	function resolveChunk(chunks: readonly PromptDiffChunk[], fmt: number): number {
		if (pickedChunk && pickedChunk.fmt === fmt && pickedChunk.index < chunks.length) {
			return pickedChunk.index;
		}
		const first = chunks.findIndex((c) => c.kind !== 'same');
		return first >= 0 ? first : 0;
	}
</script>

<WidgetFrame
	title="Small changes, different answers"
	source={{ kind: 'recorded', model: 'GPT-2 small and Qwen2.5-1.5B-Instruct' }}
	onreset={() => {
		tab = 'order';
		compareFormat = 1;
		pickedChunk = null;
	}}
>
	<Choice
		legend="Change"
		options={TABS.map(([value, label]) => ({ value, label }))}
		bind:value={tab}
	/>
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
				{@const baseFmt = s.formats[0]}
				{@const otherFmt = s.formats[compareFormat] ?? s.formats[1]}
				{@const chunks = diffPromptLayouts(baseFmt.example, otherFmt.example)}
				{@const chunkIndex = resolveChunk(chunks, compareFormat)}
				{@const activeChunk = chunks[chunkIndex]}
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

				<div class="format-diff">
					<div class="compare-picks" role="group" aria-label="Compare against the first layout">
						<span class="label">What changed from {baseFmt.name}</span>
						{#each s.formats.slice(1) as f, idx (f.name)}
							{@const fmtIdx = idx + 1}
							<button
								type="button"
								aria-pressed={compareFormat === fmtIdx}
								onclick={() => {
									compareFormat = fmtIdx;
									pickedChunk = null;
								}}
							>
								{f.name} <span class="mono">({f.correct}/{n})</span>
							</button>
						{/each}
					</div>

					<div class="chunks" role="group" aria-label="Layout diff, select any piece to inspect it">
						{#each chunks as c, i (i)}
							<button
								type="button"
								class="chunk {c.kind}"
								aria-pressed={i === chunkIndex}
								onclick={() => (pickedChunk = { fmt: compareFormat, index: i })}
							>
								<span class="chunk-mark mono" aria-hidden="true">
									{c.kind === 'removed' ? '−' : c.kind === 'added' ? '+' : ''}
								</span>
								<span class="chunk-text mono" aria-hidden="true">{c.display}</span>
								<span class="visually-hidden">
									{c.kind === 'same' ? 'unchanged' : c.kind}: {c.display}
								</span>
							</button>
						{/each}
					</div>

					<Status lines={2}>
						{#if activeChunk}
							{describePromptDiffChunk(
								activeChunk,
								baseFmt.name,
								otherFmt.name,
								baseFmt.correct,
								otherFmt.correct,
								n
							)}
						{/if}
					</Status>
				</div>
			{:else}
				{@const pos = d.position}
				{@const sx = scaleLinear([0, pos.facts - 1], [P, W - 10])}
				{@const sy = scaleLinear([0, 1], [H - P, 10])}
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
				<Figure
					max={MAX_W}
					bind:width={W}
					height={H}
					label="Chance of the right number by where the line sits. {misses.length} misses, all with the line somewhere in the middle; none when it was first or last."
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
				</Figure>
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

	.axis {
		stroke: var(--rule);
	}

	.tick {
		font-size: 11px;
		fill: var(--ink-muted);
		dominant-baseline: middle;
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

	.format-diff {
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--rule);
	}

	.compare-picks {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.compare-picks button[aria-pressed='true'] {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.chunks {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.chunk {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		min-width: 24px;
		min-height: 24px;
		max-width: 100%;
		padding: 3px var(--space-2);
		border-radius: var(--radius);
		border: 1.5px solid var(--rule);
		background: var(--surface-2);
		color: var(--ink);
		font-size: 0.85rem;
		line-height: 1.3;
		transition:
			transform var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}

	.chunk.removed {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.chunk.removed .chunk-text {
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.chunk.added {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.chunk[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.chunk-mark {
		font-weight: 700;
	}

	.chunk-text {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
