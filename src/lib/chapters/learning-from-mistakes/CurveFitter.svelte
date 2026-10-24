<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { FrameLoop } from '#lib/components/frame/loop.svelte.ts';
	import LossCurve from '#lib/components/primitives/LossCurve.svelte';
	import { CurveNet, CurveTrainer } from '#lib/math/mlp.ts';
	import { formatSigned } from '#lib/components/primitives/format.ts';

	// Points to fit: a wave, which a straight line can't follow.
	const xs = Array.from({ length: 24 }, (_, i) => -3 + (6 * i) / 23);
	const ys = xs.map((x) => Math.sin(x) + 0.3 * Math.cos(2.3 * x));

	const HIDDEN = 16;
	const KEYS = ['w1', 'b1', 'w2'] as const;
	type Params = Record<'w1' | 'b1' | 'w2' | 'b2', Float64Array>;

	let trainer = $state.raw(new CurveTrainer(new CurveNet(HIDDEN, 7)));
	let losses = $state<number[]>([]);
	let version = $state(0);
	let before = $state<Params | null>(null);

	const cell = (now: number, then: number | undefined) => ({
		value: now,
		change: then === undefined ? 0 : now - then
	});
	const params = $derived.by(() => {
		void version;
		const n = trainer.net;
		const neurons = Array.from({ length: HIDDEN }, (_, j) =>
			KEYS.map((k) => cell(n[k][j], before?.[k][j]))
		);
		const outBias = cell(n.b2[0], before?.b2[0]);
		const biggest = Math.max(
			...neurons.flat().map((c) => Math.abs(c.change)),
			Math.abs(outBias.change)
		);
		return { neurons, outBias, biggest };
	});

	const W = 420;
	const H = 220;
	const sx = (x: number) => ((x + 3.2) / 6.4) * W;
	const sy = (y: number) => H / 2 - y * (H / 2 / 1.8);

	const line = $derived.by(() => {
		void version;
		return Array.from({ length: 97 }, (_, i) => {
			const x = -3.2 + (6.4 * i) / 96;
			return `${i ? 'L' : 'M'} ${sx(x)} ${sy(Math.max(-1.8, Math.min(1.8, trainer.net.predict(x))))}`;
		}).join(' ');
	});

	function train(steps: number) {
		const n = trainer.net;
		before = { w1: n.w1.slice(), b1: n.b1.slice(), w2: n.w2.slice(), b2: n.b2.slice() };
		let loss = 0;
		for (let i = 0; i < steps; i++) loss = trainer.step(xs, ys, 0.02);
		losses = [...losses, loss];
		version++;
	}

	const loop = new FrameLoop(() => {
		train(10);
		return trainer.steps < 3000;
	});

	function reset() {
		loop.stop();
		trainer = new CurveTrainer(new CurveNet(HIDDEN, Math.floor(Math.random() * 1e6)));
		losses = [];
		before = null;
		version++;
	}
</script>

<WidgetFrame title="Train a tiny network" source={{ kind: 'computed' }} onreset={reset}>
	<div class="layout">
		<svg
			viewBox="0 0 {W} {H}"
			class="fit"
			role="img"
			aria-label="Dots to fit and the network's current curve. After {trainer.steps} training steps the loss is {losses
				.at(-1)
				?.toFixed(3) ?? 'not measured yet'}."
		>
			<line x1="0" y1={sy(0)} x2={W} y2={sy(0)} class="axis" />
			<path d={line} class="prediction" />
			{#each xs as x, i (i)}
				<circle cx={sx(x)} cy={sy(ys[i])} r="4" class="target" />
			{/each}
		</svg>
		<div>
			<LossCurve values={losses} label="Error" />
			<p class="readout mono">
				step {trainer.steps}{losses.length ? ` · error ${losses.at(-1)!.toFixed(3)}` : ''}
			</p>
		</div>
	</div>
	<div class="buttons">
		<button type="button" onclick={() => loop.toggle()} aria-pressed={loop.running}>
			{loop.running ? 'Pause' : trainer.steps ? 'Keep training' : 'Train'}
		</button>
		<button type="button" onclick={() => train(1)} disabled={loop.running}>Take 1 step</button>
	</div>

	<p class="status" aria-live={loop.running ? 'off' : 'polite'}>
		{#if before}
			The last {loop.running ? 'few steps' : 'step'} nudged all {HIDDEN * 3 + 1} numbers below, each by
			at most
			<span class="mono">{params.biggest.toFixed(3)}</span>, in whichever direction makes the error
			smaller.
		{:else}
			These {HIDDEN * 3 + 1} numbers are the whole network, and they start random. Take one step to see
			each of them move.
		{/if}
	</p>

	<div class="params">
		{#each [0, HIDDEN / 2] as start (start)}
			<table>
				<caption class="visually-hidden">
					Neurons {start + 1} to {start + HIDDEN / 2}: their numbers, and which way the last step
					moved each
				</caption>
				<thead>
					<tr>
						<th scope="col">Neuron</th>
						<th scope="col" class="num">Input weight</th>
						<th scope="col" class="num">Bias</th>
						<th scope="col" class="num">Output weight</th>
					</tr>
				</thead>
				<tbody>
					{#each params.neurons.slice(start, start + HIDDEN / 2) as cells, j (j)}
						<tr>
							<th scope="row">{start + j + 1}</th>
							{#each cells as c, k (k)}
								<td>{@render number(c)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/each}
	</div>
	<p class="note">
		The curve is the output bias ({@render number(params.outBias)}) plus, for each neuron, its
		output weight × tanh(input weight × <i>x</i> + bias). ▲ and ▼ show which way the last step moved each
		number.
	</p>
</WidgetFrame>

{#snippet number(c: { value: number; change: number })}
	<span class="mono">{formatSigned(c.value)}</span><span
		class="arrow"
		class:up={c.change > 0}
		class:down={c.change < 0}
		aria-hidden="true">{c.change > 0 ? '▲' : c.change < 0 ? '▼' : ''}</span
	>{#if c.change}<span class="visually-hidden">{c.change > 0 ? ', up' : ', down'}</span>{/if}
{/snippet}

<style>
	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-4);
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.fit {
		width: 100%;
		height: auto;
	}

	.axis {
		stroke: var(--rule);
	}

	.target {
		fill: var(--c-token);
	}

	.prediction {
		fill: none;
		stroke: var(--c-weight);
		stroke-width: 2.5;
	}

	.readout {
		font-size: 0.85rem;
		margin: var(--space-1) 0 0;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.status {
		font-size: 0.9rem;
		margin: var(--space-3) 0 var(--space-2);
		min-height: 3em;
	}

	.params {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: 0 var(--space-4);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	th,
	td {
		padding: 1px var(--space-2);
		border-bottom: 1px solid var(--rule);
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--ink-muted);
	}

	thead th:first-child,
	tbody th {
		text-align: left;
	}

	tbody th {
		font-weight: 400;
		color: var(--ink-muted);
	}

	.arrow {
		display: inline-block;
		width: 1.1em;
		font-size: 0.75em;
		text-align: right;
	}

	.arrow.up {
		color: var(--c-vector-ink);
	}

	.arrow.down {
		color: var(--c-token-ink);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
