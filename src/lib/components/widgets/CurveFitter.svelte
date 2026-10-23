<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import LossCurve from '#lib/components/primitives/LossCurve.svelte';
	import { CurveNet, CurveTrainer } from '#lib/math/mlp.ts';

	// Points to fit: a wave, which a straight line can't follow.
	const xs = Array.from({ length: 24 }, (_, i) => -3 + (6 * i) / 23);
	const ys = xs.map((x) => Math.sin(x) + 0.3 * Math.cos(2.3 * x));

	let trainer = $state(new CurveTrainer(new CurveNet(16, 7)));
	let losses = $state<number[]>([]);
	let running = $state(false);
	let frame = 0;
	let version = $state(0);

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

	function tick() {
		let loss = 0;
		for (let i = 0; i < 10; i++) loss = trainer.step(xs, ys, 0.02);
		losses = [...losses, loss];
		version++;
		if (trainer.steps >= 3000) running = false;
		if (running) frame = requestAnimationFrame(tick);
	}

	function toggle() {
		running = !running;
		if (running) frame = requestAnimationFrame(tick);
		else cancelAnimationFrame(frame);
	}

	function reset() {
		running = false;
		cancelAnimationFrame(frame);
		trainer = new CurveTrainer(new CurveNet(16, Math.floor(Math.random() * 1e6)));
		losses = [];
		version++;
	}

	$effect(() => () => cancelAnimationFrame(frame));
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
				step {trainer.steps}{#if losses.length}
					· error {losses.at(-1)!.toFixed(3)}{/if}
			</p>
		</div>
	</div>
	<button type="button" onclick={toggle} aria-pressed={running}>
		{running ? 'Pause' : trainer.steps ? 'Keep training' : 'Train'}
	</button>
</WidgetFrame>

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
</style>
