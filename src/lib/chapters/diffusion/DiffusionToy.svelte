<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { FrameLoop } from '#lib/components/frame/loop.svelte.ts';
	import Slider from '#lib/components/ui/Slider.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
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
	let trainer = $state.raw(new DiffusionTrainer(new Denoiser(32, seededRandom(1))));
	let losses = $state<number[]>([]);
	let steps = $state(0);
	let frames = $state<Point[][]>([]);
	let step = $state(0);
	let player: ReturnType<typeof setInterval> | undefined;

	const target = $derived.by(() => {
		const r = seededRandom(9);
		return Array.from({ length: 300 }, () => shapePoint(shape, r));
	});

	const loop = new FrameLoop(() => {
		let loss = 0;
		for (let i = 0; i < 20; i++) loss = trainer.step(shape, random);
		losses = [...losses, loss];
		steps = trainer.steps;
		if (steps < MAX_STEPS) return true;
		paint();
		return false;
	});

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
		loop.stop();
		clearInterval(player);
		random = seededRandom(seed);
		trainer = new DiffusionTrainer(new Denoiser(32, seededRandom(seed)));
		losses = [];
		steps = 0;
		frames = [];
		step = 0;
	}

	$effect(() => () => clearInterval(player));

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
		<Choice
			legend="Shape to learn"
			appearance="select"
			options={SHAPES.map((s) => ({ value: s, label: s }))}
			bind:value={() => shape, (s) => ((shape = s), restart())}
		/>
		<button type="button" onclick={() => loop.toggle()} aria-pressed={loop.running} disabled={done}>
			{done ? 'Trained' : loop.running ? 'Pause' : steps ? 'Keep training' : 'Train'}
		</button>
		<button type="button" onclick={paint} disabled={loop.running}>Paint 400 points</button>
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
				<div class="step">
					<Slider
						label="Denoising step"
						min={0}
						max={STEPS}
						format={(v) => `${v} of ${STEPS}`}
						concept="weight"
						bind:value={() => step, (v) => ((step = v), clearInterval(player))}
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
		--block-space: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
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

	.step {
		--block-space: 0;
		max-width: 18rem;
		margin-top: var(--space-2);
	}

	.readout {
		font-size: 0.85rem;
		margin: var(--space-1) 0;
	}

	.status {
		min-height: 3em;
	}
</style>
