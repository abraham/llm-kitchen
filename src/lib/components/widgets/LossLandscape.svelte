<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';

	// A bumpy one-weight loss: a bowl with a ripple, so big steps can overshoot or get stuck.
	const loss = (w: number) => 0.5 * (w - 1) ** 2 + 0.4 * Math.sin(3 * w) + 1;
	const slope = (w: number) => w - 1 + 1.2 * Math.cos(3 * w);

	const START = -2.2;
	let w = $state(START);
	let lr = $state(0.1);
	let history = $state<number[]>([START]);
	const id = $props.id();

	const W = 520;
	const H = 220;
	const sx = (x: number) => ((x + 3) / 7) * W;
	const sy = (y: number) => H - 14 - (y / 9) * (H - 28);
	const curve = Array.from({ length: 141 }, (_, i) => {
		const x = -3 + i / 20;
		return `${i ? 'L' : 'M'} ${sx(x)} ${sy(loss(x))}`;
	}).join(' ');

	function step(n = 1) {
		let next = w;
		const added: number[] = [];
		for (let i = 0; i < n; i++) {
			next = Math.max(-3, Math.min(4, next - lr * slope(next)));
			added.push(next);
		}
		w = next;
		history = [...history, ...added].slice(-60);
	}

	function reset() {
		w = START;
		lr = 0.1;
		history = [START];
	}

	const arrow = $derived(-Math.sign(slope(w)) * Math.min(60, Math.abs(slope(w)) * 25));
</script>

<WidgetFrame title="Rolling downhill" source={{ kind: 'computed' }} onreset={reset}>
	<svg
		viewBox="0 0 {W} {H}"
		class="landscape"
		role="img"
		aria-label="A loss curve with a ball at weight {w.toFixed(2)}, where the loss is {loss(
			w
		).toFixed(2)}. The slope there is {slope(w).toFixed(2)}."
	>
		<path d={curve} class="curve" />
		{#each history.slice(0, -1) as h, i (i)}
			<circle cx={sx(h)} cy={sy(loss(h))} r="3" class="trail" />
		{/each}
		<line x1={sx(w)} y1={sy(loss(w)) - 14} x2={sx(w) + arrow} y2={sy(loss(w)) - 14} class="arrow" />
		<circle cx={sx(w)} cy={sy(loss(w)) - 7} r="8" class="ball" />
		<text x="6" y="14" class="axis-label">loss (how wrong)</text>
		<text x={W - 6} y={H - 2} class="axis-label end">one weight →</text>
	</svg>

	<div class="controls">
		<div class="slider">
			<label for="{id}-lr" class="label"
				>Step size (learning rate) <span class="mono" aria-hidden="true">{lr.toFixed(2)}</span
				></label
			>
			<input id="{id}-lr" type="range" min="0.02" max="1.2" step="0.02" bind:value={lr} />
		</div>
		<button type="button" onclick={() => step()}>Take one step</button>
		<button type="button" onclick={() => step(20)}>Take 20 steps</button>
	</div>
	<p class="readout" aria-live="polite">
		Weight <span class="mono">{w.toFixed(2)}</span>, loss
		<span class="mono">{loss(w).toFixed(2)}</span>.
		{#if lr > 0.6}With steps this big, the ball overshoots and can bounce around.{:else if history.length > 20 && Math.abs(slope(w)) < 0.02}The
			ground is flat here: a low point, though not necessarily the lowest.{/if}
	</p>
</WidgetFrame>

<style>
	.landscape {
		width: 100%;
		height: auto;
		font-family: var(--font-sans);
	}

	.curve {
		fill: none;
		stroke: var(--c-loss);
		stroke-width: 2.5;
	}

	.trail {
		fill: var(--c-weight);
		opacity: 0.35;
	}

	.ball {
		fill: var(--c-weight);
		stroke: var(--surface);
		stroke-width: 2;
		transition:
			cx var(--duration) var(--ease),
			cy var(--duration) var(--ease);
	}

	.arrow {
		stroke: var(--ink);
		stroke-width: 2;
		marker-end: none;
	}

	.axis-label {
		font-size: 11px;
		fill: var(--ink-muted);
	}

	.end {
		text-anchor: end;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--space-3);
	}

	.slider {
		display: flex;
		flex-direction: column;
		min-width: 14rem;
	}

	input[type='range'] {
		accent-color: var(--c-weight);
	}

	.readout {
		min-height: 3em;
		margin: var(--space-3) 0 0;
	}
</style>
