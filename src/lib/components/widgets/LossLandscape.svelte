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
			next = nextWeight(next);
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

	const nextWeight = (x: number) => Math.max(-3, Math.min(4, x - lr * slope(x)));
	const next = $derived(nextWeight(w));
</script>

<WidgetFrame title="Rolling downhill" source={{ kind: 'computed' }} onreset={reset}>
	<svg
		viewBox="0 0 {W} {H}"
		class="landscape"
		role="img"
		aria-label="A loss curve with a ball at weight {w.toFixed(2)}, where the loss is {loss(
			w
		).toFixed(2)}. The slope there is {slope(w).toFixed(
			2
		)}, so the next step moves the weight to {next.toFixed(2)}."
	>
		<defs>
			<marker
				id="{id}-head"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" class="head" />
			</marker>
		</defs>
		<path d={curve} class="curve" />
		{#each history.slice(0, -1) as h, i (i)}
			<circle cx={sx(h)} cy={sy(loss(h))} r="3" class="trail" />
		{/each}
		<circle cx={sx(next)} cy={sy(loss(next)) - 7} r="8" class="landing" />
		{#if Math.abs(sx(next) - sx(w)) > 4}
			<line
				x1={sx(w)}
				y1={sy(loss(w)) - 26}
				x2={sx(next)}
				y2={sy(loss(w)) - 26}
				class="arrow"
				marker-end="url(#{id}-head)"
			/>
		{/if}
		<text x={sx(w)} y={sy(loss(w)) - 34} class="axis-label" text-anchor={next < w ? 'end' : 'start'}
			>next step</text
		>
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
	<p class="note">
		The arrow is the next step: the step size times how steep the ground is, pointing downhill. The
		dashed circle is where it lands.
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
		stroke-width: 1.5;
	}

	.head {
		fill: var(--ink);
	}

	.landing {
		fill: none;
		stroke: var(--c-weight);
		stroke-width: 1.5;
		stroke-dasharray: 3 3;
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

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
