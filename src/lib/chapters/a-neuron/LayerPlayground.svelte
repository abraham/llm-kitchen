<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { TRIANGLE, triangleNet } from '#lib/math/mlp.ts';
	import { formatSigned } from '#lib/components/primitives/format.ts';

	const START = { x1: 0.5, x2: 1 };
	let x1 = $state(START.x1);
	let x2 = $state(START.x2);
	let on = $state([true, true, true]);

	const net = $derived(triangleNet([x1, x2], on));

	// Input plane from −2 to 2 on both axes.
	const S = 200;
	const N = 40;
	const sx = (x: number) => ((x + 2) / 4) * S;
	const sy = (y: number) => ((2 - y) / 4) * S;
	const cells = $derived(
		Array.from({ length: N * N }, (_, i) => {
			const [col, row] = [i % N, Math.floor(i / N)];
			const x = -2 + ((col + 0.5) * 4) / N;
			const y = 2 - ((row + 0.5) * 4) / N;
			return { col, row, value: triangleNet([x, y], on).out.output };
		})
	);
	const edges = TRIANGLE.weights.map(([a, b], i) => {
		const c = -TRIANGLE.biases[i];
		const [px, py] = [a * c, b * c];
		return {
			x1: sx(px - b * 3),
			y1: sy(py + a * 3),
			x2: sx(px + b * 3),
			y2: sy(py - a * 3),
			labelX: sx(a * (c + 0.45)),
			labelY: sy(b * (c + 0.45))
		};
	});

	function pick(e: MouseEvent & { currentTarget: SVGRectElement }) {
		const r = e.currentTarget.getBoundingClientRect();
		const snap = (v: number) => Math.round(Math.min(2, Math.max(-2, v)) * 20) / 20;
		x1 = snap(-2 + ((e.clientX - r.left) / r.width) * 4);
		x2 = snap(2 - ((e.clientY - r.top) / r.height) * 4);
	}

	function reset() {
		({ x1, x2 } = START);
		on = [true, true, true];
	}

	const HIDDEN_Y = [40, 100, 160];
</script>

<WidgetFrame title="A layer of neurons" source={{ kind: 'computed' }} onreset={reset}>
	<div class="layout">
		<svg
			viewBox="0 0 360 200"
			class="network"
			role="img"
			aria-label="Inputs {formatSigned(x1)} and {formatSigned(
				x2
			)} go to three neurons, which output {net.hidden
				.map((h, i) => (on[i] ? formatSigned(h.output) : 'nothing (off)'))
				.join(', ')}. The output neuron gives {formatSigned(net.out.output)}."
		>
			{#each HIDDEN_Y as hy, j (j)}
				{#each [60, 140] as iy, i (i)}
					{@const w = TRIANGLE.weights[j][i]}
					{#if w !== 0}
						<line
							x1="62"
							y1={iy}
							x2="158"
							y2={hy}
							class="wire"
							class:negative={w < 0}
							class:off={!on[j]}
							style:stroke-width={1 + Math.abs(w) * 2}
						/>
					{/if}
				{/each}
				<line
					x1="202"
					y1={hy}
					x2="288"
					y2="100"
					class="wire negative"
					class:off={!on[j]}
					style:stroke-width="3"
				/>
			{/each}
			{#each [x1, x2] as x, i (i)}
				<circle cx="40" cy={60 + i * 80} r="22" class="input" />
				<text x="40" y={60 + i * 80} class="value">{formatSigned(x)}</text>
			{/each}
			{#each net.hidden as h, j (j)}
				<circle cx="180" cy={HIDDEN_Y[j]} r="22" class="node" class:off={!on[j]} />
				<text x="180" y={HIDDEN_Y[j]} class="value" class:muted={!on[j]}
					>{formatSigned(h.output)}</text
				>
				<text x="214" y={HIDDEN_Y[j] - 16} class="small">{j + 1}</text>
			{/each}
			<text x="310" y="60" class="weight">× {formatSigned(TRIANGLE.outWeight)}</text>
			<circle cx="310" cy="100" r="24" class="node out" />
			<text x="310" y="100" class="value">{formatSigned(net.out.output)}</text>
			<text x="310" y="140" class="small">output</text>
		</svg>

		<svg
			viewBox="0 0 {S} {S}"
			class="plane"
			role="img"
			aria-label="The output for every pair of inputs from −2 to 2: shaded where it is above 0. The dot marks inputs {formatSigned(
				x1
			)}, {formatSigned(x2)}."
		>
			{#each cells as c (c.col * N + c.row)}
				<rect
					x={(c.col * S) / N}
					y={(c.row * S) / N}
					width={S / N + 0.5}
					height={S / N + 0.5}
					class="cell"
					style:opacity={c.value}
				/>
			{/each}
			{#each edges as e, j (j)}
				{#if on[j]}
					<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="edge" />
					<text x={e.labelX} y={e.labelY} class="small">{j + 1}</text>
				{/if}
			{/each}
			<circle cx={sx(x1)} cy={sy(x2)} r="6" class="marker" />
			<rect width={S} height={S} class="hit" role="presentation" onclick={pick} />
		</svg>
	</div>

	<div class="controls">
		<Slider label="Input 1" min={-2} max={2} step={0.05} format={formatSigned} bind:value={x1} />
		<Slider label="Input 2" min={-2} max={2} step={0.05} format={formatSigned} bind:value={x2} />
		<fieldset>
			<legend class="label">Neurons in the layer</legend>
			{#each [0, 1, 2] as j (j)}
				<label class="check"><input type="checkbox" bind:checked={on[j]} /> {j + 1}</label>
			{/each}
		</fieldset>
	</div>

	<ul class="math mono" aria-hidden="true">
		{#each net.hidden as h, j (j)}
			{@const [a, b] = TRIANGLE.weights[j]}
			<li class:muted={!on[j]}>
				{j + 1}: {formatSigned(x1)}×{formatSigned(a)} + {formatSigned(x2)}×{formatSigned(b)} + {formatSigned(
					TRIANGLE.biases[j]
				)} = {formatSigned(h.sum)}
				→ relu = {formatSigned(h.output)}
			</li>
		{/each}
		<li>
			output: {formatSigned(TRIANGLE.outBias)} + {formatSigned(TRIANGLE.outWeight)}×({net.hidden
				.filter((_, j) => on[j])
				.map((h) => formatSigned(h.output))
				.join(' + ') || '0'}) = {formatSigned(net.out.sum)} → relu = {formatSigned(net.out.output)}
		</li>
	</ul>
	<p class="note">
		Click the square or move the sliders to change the inputs. The square's shading shows the output
		for every pair of inputs from −2 to 2, and the dashed lines are where each neuron starts to
		fire.
	</p>
</WidgetFrame>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--space-4);
		align-items: center;
	}

	@media (max-width: 40rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	svg {
		width: 100%;
		height: auto;
		font-family: var(--font-mono);
	}

	.plane {
		max-width: 16rem;
		justify-self: center;
		background: var(--surface-2);
		border: 1px solid var(--rule);
	}

	text {
		text-anchor: middle;
		dominant-baseline: middle;
		fill: var(--ink);
	}

	.value {
		font-size: 14px;
		font-weight: 600;
	}

	.small {
		font-size: 11px;
		fill: var(--ink-muted);
		font-family: var(--font-sans);
	}

	.weight {
		font-size: 12px;
		fill: var(--c-weight-ink);
	}

	.muted {
		fill: var(--ink-muted);
		color: var(--ink-muted);
	}

	.input {
		fill: var(--c-token-tint);
		stroke: var(--c-token);
		stroke-width: 1.5;
	}

	.wire {
		stroke: var(--c-weight);
	}

	/* Negative weights are dashed so the sign isn't shown by color alone. */
	.wire.negative {
		stroke-dasharray: 6 4;
	}

	.wire.off {
		stroke: var(--rule);
	}

	.node {
		fill: var(--c-weight-tint);
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.node.off {
		fill: var(--surface-2);
		stroke: var(--rule);
		stroke-dasharray: 3 3;
	}

	.cell {
		fill: var(--c-weight);
	}

	.edge {
		stroke: var(--ink-muted);
		stroke-width: 1;
		stroke-dasharray: 4 3;
	}

	.marker {
		fill: var(--c-token);
		stroke: var(--surface);
		stroke-width: 2;
	}

	.hit {
		fill: transparent;
		cursor: crosshair;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-3);
		--block-space: 0;
		margin-top: var(--space-4);
	}

	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		align-items: center;
	}

	legend {
		width: 100%;
		padding: 0;
	}

	.check {
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	input[type='checkbox'] {
		accent-color: var(--c-weight);
	}

	.math {
		list-style: none;
		margin: var(--space-4) 0 0;
		padding: 0;
		font-size: 0.85rem;
		overflow-x: auto;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
