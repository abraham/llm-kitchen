<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import Axis from '#lib/components/ui/Axis.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { play, type DecisionRun, type GridWorld } from '#lib/math/decision.ts';
	import { scaleLinear } from '#lib/math/scale.ts';
	import { motion } from '#lib/stores/motion-prefs.svelte.ts';

	const DEFAULT = 12;
	const MIN = -26;
	const MAX = 24;
	const ARROWS = ['↑', '→', '↓', '←'];
	const data = useDataset('decisions/grid');

	let target = $state(DEFAULT);
	let shown = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;
	let playing = $state(false);

	function stop() {
		clearInterval(timer);
		playing = false;
	}

	function aim(v: number) {
		stop();
		target = v;
		shown = 0;
	}

	function playAll(run: DecisionRun) {
		stop();
		if (shown >= run.steps.length) shown = 0;
		if (motion.reduced) {
			shown = run.steps.length;
			return;
		}
		playing = true;
		timer = setInterval(() => {
			shown += 1;
			if (shown >= run.steps.length) stop();
		}, 350);
	}

	$effect(() => stop);

	const CELL = 44;
	const rc = (w: GridWorld, cell: number) => [Math.floor(cell / w.size), cell % w.size] as const;
	const name = (w: GridWorld, cell: number) => {
		const [r, c] = rc(w, cell);
		return `${'ABCDEFGH'[c]}${w.size - r}`;
	};
	const centre = (w: GridWorld, cell: number) => {
		const [r, c] = rc(w, cell);
		return [c * CELL + CELL / 2, r * CELL + CELL / 2] as const;
	};
	const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
	const num = (n: number) => (n < 0 ? `−${-n}` : String(n));

	const H_MAX = 384;
	let H_W = $state(H_MAX);
	const H_H = 64;
	/** Where the histogram's axis runs; its tick labels sit below. */
	const BASE = H_H - 18;
	const hx = $derived(scaleLinear([MIN, MAX], [16, H_W - 16]));
</script>

<WidgetFrame title="Aim for a score" source={{ kind: 'computed' }} onreset={() => aim(DEFAULT)}>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const w = rec.world}
			{@const run = play(w, rec.net, target)}
			{@const cells = [w.start, ...run.steps.slice(1).map((s) => s.cell), run.end]}
			{@const here = cells[shown]}
			{@const done = shown >= run.steps.length}
			{@const scored = run.steps.slice(0, shown).reduce((a, s) => a + s.reward, 0)}
			{@const counts = rec.training.returns}
			{@const seen = counts[String(target)] ?? 0}
			{@const most = Math.max(...Object.values(counts))}
			<Slider
				label="Score to aim for"
				min={MIN}
				max={MAX}
				format={num}
				concept="prob"
				width={3}
				bind:value={() => target, aim}
			/>

			<figure class="hist">
				<Figure
					max={H_MAX}
					bind:width={H_W}
					height={H_H}
					label="How many of the {rec.training.runs} training runs scored each total, from {num(
						MIN
					)} to 12. {seen} scored {num(target)}."
				>
					{#each Object.entries(counts) as [score, n] (score)}
						<rect
							class:on={Number(score) === target}
							x={hx(Number(score)) - 2.5}
							y={BASE - (n / most) * (BASE - 4)}
							width="5"
							height={(n / most) * (BASE - 4)}
						/>
					{/each}
					<line class="aim" x1={hx(target)} x2={hx(target)} y1="0" y2={BASE + 2} />
					<Axis scale={hx} side="bottom" at={BASE} ticks={[MIN, -10, 0, 12, MAX]} format={num} />
				</Figure>
				<figcaption>
					<span class="mono">{formatCount(seen)}</span> of {formatCount(rec.training.runs)} training runs
					scored {num(target)}.
				</figcaption>
			</figure>

			<div class="layout">
				<div class="grid">
					<Figure
						viewBox={[w.size * CELL, w.size * CELL]}
						label="A {w.size} by {w.size} grid. Start at {name(w, w.start)}, goal at {name(
							w,
							w.goal
						)}, pits at {w.pits.map((p) => name(w, p)).join(', ')}. The player is at {name(
							w,
							here
						)} after {shown} moves."
					>
						{#each Array.from({ length: w.size * w.size }, (_, i) => i) as i (i)}
							{@const [r, c] = rc(w, i)}
							<rect
								x={c * CELL + 1}
								y={r * CELL + 1}
								width={CELL - 2}
								height={CELL - 2}
								rx="4"
								class={i === w.goal ? 'goal' : w.pits.includes(i) ? 'pit' : 'floor'}
							/>
							<text class="cell-name" x={c * CELL + 4} y={r * CELL + 12}>{name(w, i)}</text>
							{#if i === w.goal}
								<text class="mark" x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 6}>⚑</text>
							{:else if w.pits.includes(i)}
								<text class="mark pit-mark" x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 6}
									>pit</text
								>
							{/if}
						{/each}
						<polyline
							class="path"
							points={cells
								.slice(0, shown + 1)
								.map((c) => centre(w, c).join(','))
								.join(' ')}
						/>
						<circle class="player" cx={centre(w, here)[0]} cy={centre(w, here)[1]} r="9" />
					</Figure>
				</div>

				<div class="side">
					<div class="controls">
						<button
							type="button"
							onclick={() => (stop(), (shown = Math.min(run.steps.length, shown + 1)))}
							disabled={done}>Step</button
						>
						<button
							type="button"
							onclick={() => (playing ? stop() : playAll(run))}
							aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button
						>
						<button type="button" onclick={() => (stop(), (shown = 0))} disabled={shown === 0}
							>Start over</button
						>
					</div>
					<p class="status" aria-live="polite">
						{#if shown === 0}
							Aiming for {num(target)}. Step through the run, or play it.
						{:else if !done}
							Move {shown}: {w.moves[run.steps[shown - 1].action]}. Score so far {num(scored)}.
						{:else if run.outcome === 'goal'}
							Reached the goal in {run.steps.length} moves: scored {num(run.total)}.
						{:else if run.outcome === 'pit'}
							Fell into a pit on move {run.steps.length}: scored {num(run.total)}.
						{:else}
							Used all {w.horizon} moves without reaching the goal: scored {num(run.total)}.
						{/if}
					</p>
					{#if !done}
						<p class="next-label">The model’s next move from {name(w, here)}:</p>
						<ProbBars
							caption="The model's probability for each move from {name(w, here)}"
							bars={w.moves.map((m, a) => ({
								label: `${ARROWS[a]}\u00a0${m}`,
								p: run.steps[shown].probs[a],
								highlight: a === run.steps[shown].action
							}))}
							scaleTo="one"
						/>
					{/if}
				</div>
			</div>

			<div class="tokens" aria-label="The tokens the model has read so far" role="group">
				{#each run.steps.slice(0, Math.min(shown + 1, run.steps.length)) as s, t (t)}
					<span class="chip ret" title="still to earn">{num(s.toGo)}</span>
					<span class="chip cell" title="cell">{name(w, s.cell)}</span>
					{#if t < shown}
						<span class="chip move" title="move">{ARROWS[s.action]}</span>
					{:else}
						<span class="chip next" title="the move to predict">?</span>
					{/if}
				{/each}
			</div>
			<p class="key" aria-hidden="true">
				<span class="chip ret">12</span> still to earn
				<span class="chip cell">A1</span> cell
				<span class="chip move">→</span> move
				{#if shown > 0}· last reward {signed(run.steps[shown - 1].reward)}{/if}
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.hist {
		margin: var(--space-2) 0 var(--space-3);
	}

	.hist rect {
		fill: var(--ink-muted);
		opacity: 0.45;
	}

	.hist rect.on {
		fill: var(--c-prob);
		opacity: 1;
	}

	.hist .aim {
		stroke: var(--c-prob);
		stroke-width: 2;
	}

	figcaption {
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
		align-items: start;
	}

	.grid {
		max-width: 16rem;
	}

	.floor {
		fill: var(--surface-2);
	}

	.goal {
		fill: var(--c-vector-tint);
		stroke: var(--c-vector);
	}

	.pit {
		fill: var(--c-loss-tint);
		stroke: var(--c-loss);
	}

	.cell-name {
		font-family: var(--font-mono);
		font-size: max(10px, var(--min-text));
		fill: var(--ink-muted);
	}

	.mark {
		font-family: var(--font-sans);
		font-size: max(16px, var(--min-text));
		text-anchor: middle;
		fill: var(--c-vector);
	}

	.pit-mark {
		font-size: max(11px, var(--min-text));
		fill: var(--c-loss);
	}

	.path {
		fill: none;
		stroke: var(--c-prob);
		stroke-width: 3;
		stroke-linejoin: round;
		stroke-linecap: round;
		opacity: 0.7;
	}

	.player {
		fill: var(--c-prob);
		stroke: var(--surface);
		stroke-width: 2;
	}

	.controls {
		--block-space: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.status {
		min-height: 3em;
	}

	.next-label {
		margin: 0;
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.tokens {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: var(--space-3);
	}

	.chip {
		display: inline-block;
		min-width: 2rem;
		padding: 1px var(--space-1);
		border: 1.5px solid;
		border-radius: var(--radius);
		font-family: var(--font-mono);
		font-size: 0.85rem;
		text-align: center;
	}

	.ret {
		border-color: var(--c-prob);
		background: var(--c-prob-tint);
	}

	.cell {
		border-color: var(--c-vector);
		background: var(--c-vector-tint);
	}

	.move {
		border-color: var(--c-token);
		background: var(--c-token-tint);
	}

	.next {
		border-style: dashed;
		border-color: var(--c-token);
	}

	.key {
		font-size: 0.85rem;
		color: var(--ink-muted);
	}
</style>
