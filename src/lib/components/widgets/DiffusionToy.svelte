<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import LossCurve from '#lib/components/primitives/LossCurve.svelte';
	import {
		Denoiser,
		DiffusionTrainer,
		STEPS,
		generate,
		shapePoint,
		type Point,
		type Shape
	} from '#lib/math/diffusion.ts';
	import { seededRandom } from '#lib/math/sampling.ts';

	const SHAPES: Shape[] = ['ring', 'square', 'two blobs'];
	const NOUN: Record<Shape, string> = {
		ring: 'ring',
		square: 'square',
		'two blobs': 'pair of blobs'
	};
	const MAX_STEPS = 2000;
	const COUNT = 400;

	let shape = $state<Shape>('ring');
	let random = seededRandom(1);
	let trainer = $state(new DiffusionTrainer(new Denoiser(32, seededRandom(1))));
	let losses = $state<number[]>([]);
	let steps = $state(0);
	let running = $state(false);
	let frames = $state<Point[][]>([]);
	let step = $state(0);
	let frame = 0;
	let player: ReturnType<typeof setInterval> | undefined;
	const id = $props.id();

	const target = $derived.by(() => {
		const r = seededRandom(9);
		return Array.from({ length: 300 }, () => shapePoint(shape, r));
	});

	function tick() {
		let loss = 0;
		for (let i = 0; i < 20; i++) loss = trainer.step(shape, random);
		losses = [...losses, loss];
		steps = trainer.steps;
		if (steps >= MAX_STEPS) {
			running = false;
			paint();
		}
		if (running) frame = requestAnimationFrame(tick);
	}

	function toggle() {
		running = !running;
		if (running) frame = requestAnimationFrame(tick);
		else cancelAnimationFrame(frame);
	}

	function paint() {
		clearInterval(player);
		frames = generate(trainer.model, COUNT, random);
		if (prefersReducedMotion.current) {
			step = STEPS;
			return;
		}
		step = 0;
		player = setInterval(() => {
			step = Math.min(STEPS, step + 1);
			if (step === STEPS) clearInterval(player);
		}, 60);
	}

	function restart(seed = Math.floor(Math.random() * 1e6)) {
		running = false;
		cancelAnimationFrame(frame);
		clearInterval(player);
		random = seededRandom(seed);
		trainer = new DiffusionTrainer(new Denoiser(32, seededRandom(seed)));
		losses = [];
		steps = 0;
		frames = [];
		step = 0;
	}

	$effect(() => () => {
		cancelAnimationFrame(frame);
		clearInterval(player);
	});

	const S = 240;
	const sc = (v: number) => S / 2 + (v / 2.6) * (S / 2);
	const points = $derived(frames[step] ?? []);
	const done = $derived(steps >= MAX_STEPS);
</script>

<WidgetFrame
	title="Painting from noise"
	source={{ kind: 'computed' }}
	onreset={() => {
		shape = 'ring';
		restart();
	}}
>
	<div class="controls">
		<div class="pick">
			<label for="{id}-shape" class="label">Shape to learn</label>
			<select id="{id}-shape" bind:value={shape} onchange={() => restart()}>
				{#each SHAPES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</div>
		<button type="button" onclick={toggle} aria-pressed={running} disabled={done}>
			{done ? 'Trained' : running ? 'Pause' : steps ? 'Keep training' : 'Train'}
		</button>
		<button type="button" onclick={paint} disabled={running}>Paint 400 points</button>
	</div>

	<div class="layout">
		<div>
			<svg
				viewBox="0 0 {S} {S}"
				class="plot"
				role="img"
				aria-label={frames.length
					? `${COUNT} points, ${step} of ${STEPS} denoising steps done. The faint dots show the ${NOUN[shape]} the model was trained on.`
					: `The ${NOUN[shape]} the model will learn, as faint dots.`}
			>
				{#each target as [x, y], i (i)}
					<circle cx={sc(x)} cy={sc(-y)} r="1.6" class="target" />
				{/each}
				{#each points as [x, y], i (i)}
					<circle cx={sc(x)} cy={sc(-y)} r="2.2" class="point" />
				{/each}
			</svg>
			{#if frames.length}
				<div class="slider">
					<label for="{id}-step" class="label"
						>Denoising step <span class="mono" aria-hidden="true">{step} of {STEPS}</span></label
					>
					<input
						id="{id}-step"
						type="range"
						min="0"
						max={STEPS}
						bind:value={step}
						oninput={() => clearInterval(player)}
					/>
				</div>
			{/if}
		</div>
		<div>
			<LossCurve values={losses} label="Error predicting the noise" />
			<p class="readout mono">
				step {steps}{losses.length ? ` · error ${losses.at(-1)!.toFixed(3)}` : ''}
			</p>
			<p class="status" aria-live="polite">
				{#if !frames.length}
					Train the network, then paint: every point starts as pure noise.
				{:else if step === 0}
					Pure noise: {COUNT} random points.
				{:else if step < STEPS}
					{step} of {STEPS} steps: each step removes a little of the noise the network predicts.
				{:else if steps < 200}
					Done, but an untrained network can't tell noise from shape, so the points stay a mess.
				{:else}
					Done: the noise has become a new {NOUN[shape]}, drawn point by point from scratch.
				{/if}
			</p>
		</div>
	</div>
</WidgetFrame>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.pick {
		display: flex;
		flex-direction: column;
	}

	select {
		font: inherit;
	}

	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: var(--space-4);
		align-items: start;
	}

	.plot {
		display: block;
		width: 100%;
		max-width: 18rem;
		height: auto;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.target {
		fill: var(--ink-muted);
		opacity: 0.25;
	}

	.point {
		fill: var(--c-weight);
	}

	.slider {
		display: flex;
		flex-direction: column;
		max-width: 18rem;
		margin-top: var(--space-2);
	}

	input[type='range'] {
		accent-color: var(--c-weight);
	}

	.readout {
		font-size: 0.85rem;
		margin: var(--space-1) 0;
	}

	.status {
		min-height: 3em;
	}
</style>
