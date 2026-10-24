<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import { positionsProcessed } from '#lib/harness/cache.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = useDataset('caching/kv-cache');
	const STEPS = 8;
	const stepper = new Stepper(STEPS);
	let cache = $state(false);
	const fmt = (n: number) => n.toLocaleString('en-US');
	const describe = (i: number) => `Step ${i + 1} of ${STEPS}`;

	/** What happens to position `col` on step `row`: run through the model, reused, or not there yet. */
	function cell(row: number, col: number, p: number): 'run' | 'reused' | 'none' {
		if (col >= p + row) return 'none';
		if (!cache || row === 0 || col === p + row - 1) return 'run';
		return 'reused';
	}

	// Chart of the measured time per new token.
	const W = 560;
	const H = 200;
	const PAD = { left: 44, right: 120, top: 12, bottom: 36 };
	function line(ms: number[], max: number) {
		const x = (i: number) => PAD.left + (i / (ms.length - 1)) * (W - PAD.left - PAD.right);
		const y = (v: number) => H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);
		return {
			points: ms.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
			end: { x: x(ms.length - 1), y: y(ms.at(-1)!) },
			y
		};
	}
</script>

<WidgetFrame
	title="Reusing keys and values"
	label="Step through"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => {
		stepper.reset();
		cache = false;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const p = d.promptTokens.length}
			{@const tokens = [...d.promptTokens, ...d.generated.slice(0, STEPS)]}
			{@const row = stepper.index}
			<Choice
				legend="Key-value cache"
				options={[
					{ value: false, label: 'Off' },
					{ value: true, label: 'On' }
				]}
				bind:value={cache}
			/>

			<ScrollBox label="Which tokens each step runs">
				<table>
					<caption class="visually-hidden"
						>For each step, which tokens go through the model and which are reused from the cache</caption
					>
					<thead>
						<tr>
							<th scope="col"><span class="visually-hidden">Step</span></th>
							{#each tokens as t, col (col)}
								<th scope="col" class="tok" class:hidden={col >= p + row + 1}
									>{displayToken(t.text)}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each Array.from({ length: row + 1 }, (_, r) => r) as r (r)}
							<tr class:current={r === row}>
								<th scope="row">Step {r + 1}</th>
								{#each tokens.map((_, col) => col) as col (col)}
									{@const c = cell(r, col, p)}
									<td class={c}
										>{#if c === 'run'}<span aria-hidden="true">●</span><span class="visually-hidden"
												>run</span
											>{:else if c === 'reused'}<span aria-hidden="true">○</span><span
												class="visually-hidden">reused</span
											>{/if}</td
									>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</ScrollBox>
			<ul class="legend" aria-hidden="true">
				<li><span class="run">●</span> run through all {canonical.layers} blocks</li>
				<li><span class="reused">○</span> keys and values reused from the cache</li>
			</ul>

			<Status lines={3}>
				Step {row + 1} picks <strong class="mono">{displayToken(d.generated[row].text)}</strong>. So
				far the model has run <strong>{fmt(positionsProcessed(p, row + 1, cache))}</strong> token
				positions with the cache {cache ? 'on' : 'off'}, against {fmt(
					positionsProcessed(p, row + 1, !cache)
				)} with it {cache ? 'off' : 'on'}. Either way it picks the same tokens.
			</Status>

			{@const max = Math.max(...d.msPerToken.noCache)}
			{@const off = line(d.msPerToken.noCache, max)}
			{@const on = line(d.msPerToken.cache, max)}
			<figure>
				<svg
					viewBox="0 0 {W} {H}"
					role="img"
					aria-label="Measured time for each of {d.generated
						.length} new tokens. Without the cache it grows from {Math.round(
						d.msPerToken.noCache[0]
					)} to {Math.round(
						d.msPerToken.noCache.at(-1)!
					)} milliseconds; with the cache it stays near {Math.round(d.msPerToken.cache.at(-1)!)}."
				>
					{#each [0, 50, 100] as v (v)}
						{#if v <= max}
							<line x1={PAD.left} x2={W - PAD.right} y1={off.y(v)} y2={off.y(v)} class="grid" />
							<text x={PAD.left - 6} y={off.y(v) + 4} class="tick y">{v}</text>
						{/if}
					{/each}
					<polyline points={off.points} class="off" />
					<polyline points={on.points} class="on" />
					<text x={off.end.x + 6} y={off.end.y + 4} class="name">without the cache</text>
					<text x={on.end.x + 6} y={on.end.y + 4} class="name">with the cache</text>
					<text x={(PAD.left + W - PAD.right) / 2} y={H - 6} class="axis"
						>New token 1 to {d.generated.length}</text
					>
					<text
						x={12}
						y={(PAD.top + H - PAD.bottom) / 2}
						class="axis"
						transform="rotate(-90 12 {(PAD.top + H - PAD.bottom) / 2})">ms per token</text
					>
				</svg>
				<figcaption>
					Measured: {d.generated.length} new tokens took {(d.totalMs.noCache / 1000).toFixed(1)} s without
					the cache and {(d.totalMs.cache / 1000).toFixed(1)} s with it ({d.device}). Both runs
					picked the same tokens.
				</figcaption>
			</figure>
		{/snippet}
	</Loading>

	{#snippet controls()}
		<StepController {stepper} {describe} />
	{/snippet}
</WidgetFrame>

<style>
	table {
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	th,
	td {
		padding: 2px 4px;
		text-align: center;
		white-space: nowrap;
	}

	tbody th {
		font-family: var(--font-sans);
		font-weight: 400;
		text-align: left;
		color: var(--ink-muted);
	}

	.tok {
		font-family: var(--font-mono);
		font-weight: 400;
		border-bottom: 2px solid var(--c-token);
	}

	.tok.hidden {
		visibility: hidden;
	}

	tr.current th {
		color: var(--ink);
		font-weight: 700;
	}

	td.run,
	.legend .run {
		color: var(--c-token-ink);
	}

	td.reused,
	.legend .reused {
		color: var(--c-vector-ink);
	}

	.legend {
		list-style: none;
		padding: 0;
		margin: var(--space-2) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	figure {
		margin: 0;
	}

	svg {
		width: 100%;
		height: auto;
		font-family: var(--font-sans);
	}

	.grid {
		stroke: var(--rule);
	}

	.tick {
		font-size: 11px;
		fill: var(--ink-muted);
	}

	.tick.y {
		text-anchor: end;
	}

	.axis {
		font-size: 12px;
		fill: var(--ink);
		text-anchor: middle;
	}

	.name {
		font-size: 12px;
		fill: var(--ink);
	}

	polyline {
		fill: none;
		stroke-width: 1.5;
	}

	.off {
		stroke: var(--c-token);
	}

	.on {
		stroke: var(--c-vector);
	}

	figcaption {
		font-size: 0.875rem;
		color: var(--ink-muted);
	}
</style>
