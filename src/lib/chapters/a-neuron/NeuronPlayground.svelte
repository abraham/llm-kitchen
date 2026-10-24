<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { activate, neuron, type Activation } from '#lib/math/mlp.ts';

	const START = { x1: 1, x2: 0.5, w1: 0.8, w2: -1.2, bias: 0.3, kind: 'relu' as Activation };
	let x1 = $state(START.x1);
	let x2 = $state(START.x2);
	let w1 = $state(START.w1);
	let w2 = $state(START.w2);
	let bias = $state(START.bias);
	let kind = $state<Activation>(START.kind);
	const id = $props.id();

	const result = $derived(neuron([x1, x2], [w1, w2], bias, kind));
	const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

	const NAMES: Record<Activation, string> = {
		none: 'none (output = sum)',
		relu: 'ReLU (negative → 0)',
		sigmoid: 'sigmoid (squash to 0…1)',
		tanh: 'tanh (squash to −1…1)'
	};

	// Activation plot: z from -4 to 4.
	const PW = 220;
	const PH = 140;
	const px = (z: number) => ((z + 4) / 8) * PW;
	const py = (y: number) => PH / 2 - y * (PH / 2 / 2.2);
	const curve = $derived(
		Array.from({ length: 81 }, (_, i) => {
			const z = -4 + i / 10;
			return `${i ? 'L' : 'M'} ${px(z)} ${py(activate(kind, z))}`;
		}).join(' ')
	);

	function reset() {
		({ x1, x2, w1, w2, bias, kind } = START);
	}

	const sliders = [
		{ key: 'x1', label: 'Input 1', get: () => x1, set: (v: number) => (x1 = v), concept: 'token' },
		{ key: 'x2', label: 'Input 2', get: () => x2, set: (v: number) => (x2 = v), concept: 'token' },
		{
			key: 'w1',
			label: 'Weight 1',
			get: () => w1,
			set: (v: number) => (w1 = v),
			concept: 'weight'
		},
		{
			key: 'w2',
			label: 'Weight 2',
			get: () => w2,
			set: (v: number) => (w2 = v),
			concept: 'weight'
		},
		{ key: 'b', label: 'Bias', get: () => bias, set: (v: number) => (bias = v), concept: 'weight' }
	];
</script>

<WidgetFrame title="One neuron" source={{ kind: 'computed' }} onreset={reset}>
	<div class="layout">
		<svg
			viewBox="0 0 420 200"
			class="neuron"
			role="img"
			aria-label="Input 1 is {fmt(x1)} times weight {fmt(w1)}, plus input 2 {fmt(
				x2
			)} times weight {fmt(w2)}, plus bias {fmt(bias)}, sums to {fmt(
				result.sum
			)}. After the activation function the output is {fmt(result.output)}."
		>
			{#each [{ x: x1, w: w1, y: 50 }, { x: x2, w: w2, y: 150 }] as input, i (i)}
				<line
					x1="60"
					y1={input.y}
					x2="210"
					y2="100"
					class="wire"
					class:negative={input.w < 0}
					style:stroke-width={1 + Math.abs(input.w) * 3}
				/>
				<circle cx="40" cy={input.y} r="22" class="input" />
				<text x="40" y={input.y} class="value">{fmt(input.x)}</text>
				<text x="135" y={input.y + (i === 0 ? 18 : -10)} class="weight">× {fmt(input.w)}</text>
			{/each}
			<text x="230" y="35" class="weight">+ bias {fmt(bias)}</text>
			<circle cx="230" cy="100" r="34" class="node" />
			<text x="230" y="92" class="small">sum</text>
			<text x="230" y="110" class="value">{fmt(result.sum)}</text>
			<line x1="264" y1="100" x2="318" y2="100" class="out-wire" />
			<rect x="318" y="78" width="96" height="44" rx="6" class="output" />
			<text x="366" y="92" class="small">output</text>
			<text x="366" y="110" class="value">{fmt(result.output)}</text>
		</svg>

		<svg
			viewBox="0 0 {PW} {PH}"
			class="plot"
			role="img"
			aria-label="Activation function {NAMES[kind]}"
		>
			<line x1="0" y1={py(0)} x2={PW} y2={py(0)} class="axis" />
			<line x1={px(0)} y1="0" x2={px(0)} y2={PH} class="axis" />
			<path d={curve} class="curve" />
			{#if result.sum >= -4 && result.sum <= 4 && Math.abs(result.output) <= 2.2}
				<circle cx={px(result.sum)} cy={py(result.output)} r="5" class="marker" />
			{/if}
			<text x="4" y="12" class="small left">output</text>
			<text x={PW - 4} y={py(0) - 4} class="small right">sum</text>
		</svg>
	</div>

	<div class="sliders">
		{#each sliders as s (s.key)}
			<div class="slider" data-concept={s.concept}>
				<label for="{id}-{s.key}" class="label"
					>{s.label} <span class="mono" aria-hidden="true">{fmt(s.get())}</span></label
				>
				<input
					id="{id}-{s.key}"
					type="range"
					min="-2"
					max="2"
					step="0.05"
					value={s.get()}
					oninput={(e) => s.set(+e.currentTarget.value)}
				/>
			</div>
		{/each}
		<div class="slider">
			<label for="{id}-act" class="label">Activation function</label>
			<select id="{id}-act" bind:value={kind}>
				{#each Object.entries(NAMES) as [value, name] (value)}<option {value}>{name}</option>{/each}
			</select>
		</div>
	</div>

	<p class="math mono" aria-hidden="true">
		{fmt(x1)}×{fmt(w1)} + {fmt(x2)}×{fmt(w2)} + {fmt(bias)} = {fmt(result.sum)} → {kind === 'none'
			? ''
			: `${kind}(${fmt(result.sum)}) = `}{fmt(result.output)}
	</p>
</WidgetFrame>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
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

	text {
		text-anchor: middle;
		dominant-baseline: middle;
		fill: var(--ink);
	}

	.value {
		font-size: 15px;
		font-weight: 600;
	}

	.small {
		font-size: 11px;
		fill: var(--ink-muted);
		font-family: var(--font-sans);
	}

	.left {
		text-anchor: start;
	}

	.right {
		text-anchor: end;
	}

	.weight {
		font-size: 12px;
		fill: var(--c-weight-ink);
	}

	.input {
		fill: var(--c-token-tint);
		stroke: var(--c-token);
		stroke-width: 1.5;
	}

	.wire {
		stroke: var(--c-weight);
		transition: stroke-width var(--duration) var(--ease);
	}

	/* Negative weights are dashed so the sign isn't shown by color alone. */
	.wire.negative {
		stroke-dasharray: 6 4;
	}

	.node {
		fill: var(--c-weight-tint);
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.out-wire {
		stroke: var(--ink-muted);
		stroke-width: 2;
	}

	.output {
		fill: var(--surface-2);
		stroke: var(--rule);
	}

	.plot {
		overflow: hidden;
	}

	.axis {
		stroke: var(--rule);
	}

	.curve {
		fill: none;
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.marker {
		fill: var(--c-weight);
		stroke: var(--surface);
		stroke-width: 2;
	}

	.sliders {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.slider {
		display: flex;
		flex-direction: column;
	}

	input[type='range'] {
		accent-color: var(--c-weight);
	}

	[data-concept='token'] input[type='range'] {
		accent-color: var(--c-token);
	}

	select {
		font-size: 0.875rem;
	}

	.math {
		margin: var(--space-4) 0 0;
		font-size: 0.9rem;
		overflow-x: auto;
	}
</style>
