<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { cascade } from '#lib/harness/routing.ts';

	const DEFAULT = 60;
	const data = useDataset('routing/cascade');
	let threshold = $state(DEFAULT);

	const W = 560;
	const H = 92;
	const PAD = 12;
	const ROW = { right: 30, wrong: 66 };
	const x = (c: number) => PAD + c * (W - 2 * PAD);
	const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<WidgetFrame
	title="Ask the small model first"
	source={{ kind: 'recorded', model: 'Qwen2.5-Instruct, 0.5B and 1.5B' }}
	onreset={() => (threshold = DEFAULT)}
>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const t = threshold / 100}
			{@const result = cascade(rec, t)}
			{@const small = cascade(rec, 0)}
			{@const big = cascade(rec, 2)}
			{@const n = rec.questions.length}
			{@const wrongBelow = rec.questions.filter((q) => !q.small.correct && q.small.confidence < t)}
			{@const wrongAll = rec.questions.filter((q) => !q.small.correct)}
			<Slider
				label="Pass a question on when the small model’s confidence is below"
				min={0}
				max={100}
				step={5}
				format={(v) => `${v}%`}
				concept="prob"
				width={4}
				bind:value={threshold}
			/>

			<figure class="plot">
				<p class="legend" aria-hidden="true">
					<span><span class="dot right"></span>small model right</span>
					<span><span class="dot wrong"></span>small model wrong</span>
					<span><span class="zone"></span>passed on to the big model</span>
				</p>
				<svg
					viewBox="0 0 {W} {H}"
					role="img"
					aria-label="Each of the {n} questions placed by the small model's confidence. {wrongBelow.length} of its {wrongAll.length} wrong answers are below {threshold}% and get passed on."
				>
					<rect
						class="zone"
						x={x(0)}
						y="8"
						width={Math.max(0, x(Math.min(t, 1)) - x(0))}
						height={H - 28}
					/>
					<line class="axis" x1={x(0)} x2={x(1)} y1={H - 20} y2={H - 20} />
					{#each [0, 0.25, 0.5, 0.75, 1] as tick (tick)}
						<text class="tick" x={x(tick)} y={H - 6}>{pct(tick)}</text>
					{/each}
					{#each rec.questions as q, i (i)}
						<circle
							class={q.small.correct ? 'right' : 'wrong'}
							cx={x(q.small.confidence)}
							cy={(q.small.correct ? ROW.right : ROW.wrong) + ((i % 3) - 1) * 7}
							r="4.5"
						/>
					{/each}
					{#if t <= 1}
						<line class="threshold" x1={x(t)} x2={x(t)} y1="4" y2={H - 20} />
					{/if}
				</svg>
				<figcaption>The small model’s confidence in its own answer, for each question.</figcaption>
			</figure>

			<dl class="readouts" aria-live="polite">
				<div>
					<dt>Passed on</dt>
					<dd><span class="mono">{result.escalated}</span> of {n} questions</dd>
				</div>
				<div>
					<dt>Right</dt>
					<dd>
						<span class="mono">{result.right}</span> of {n}
						<span class="muted">(small alone {small.right}, big alone {big.right})</span>
					</dd>
				</div>
				<div>
					<dt>Cost</dt>
					<dd>
						<span class="mono">{pct(result.cost)}</span> of always asking the big model
						<span class="muted">(small alone {pct(small.cost)})</span>
					</dd>
				</div>
			</dl>

			<ScrollBox label="All {n} questions" maxHeight="16rem">
				<table>
					<caption class="visually-hidden"
						>Each question, the small model's answer and confidence, and who answered</caption
					>
					<thead>
						<tr
							><th scope="col">Question</th><th scope="col">Small model</th><th scope="col"
								>Answered by</th
							></tr
						>
					</thead>
					<tbody>
						{#each rec.questions as q, i (i)}
							{@const pass = q.small.confidence < t}
							{@const final = pass ? q.big : q.small}
							<tr class:pass>
								<td>{q.question}</td>
								<td>
									{q.small.correct ? '✓' : '✗'}
									{q.small.answer}
									<span class="muted mono">{pct(q.small.confidence)}</span>
								</td>
								<td>
									{final.correct ? '✓' : '✗'}
									{pass ? `big: ${q.big.answer}` : 'small'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</ScrollBox>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.plot {
		margin: 0 0 var(--space-3);
	}

	svg {
		width: 100%;
		max-width: 36rem;
		height: auto;
		display: block;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: 0 0 var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		margin-right: var(--space-1);
	}

	.dot.right,
	circle.right {
		background: var(--c-vector);
		fill: var(--c-vector);
	}

	.dot.wrong,
	circle.wrong {
		background: var(--c-loss);
		fill: var(--c-loss);
	}

	span.zone {
		display: inline-block;
		width: 0.9rem;
		height: 0.6rem;
		margin-right: var(--space-1);
		background: var(--c-prob-tint);
		border: 1px solid var(--c-prob);
	}

	rect.zone {
		fill: var(--c-prob-tint);
	}

	.threshold {
		stroke: var(--c-prob);
		stroke-width: 2;
	}

	.axis {
		stroke: var(--rule);
	}

	.tick {
		font-family: var(--font-sans);
		font-size: 11px;
		fill: var(--ink-muted);
		text-anchor: middle;
	}

	figcaption {
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.readouts {
		display: grid;
		gap: var(--space-1);
		margin: 0 0 var(--space-3);
	}

	.readouts div {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	dt {
		font-weight: 600;
		min-width: 6rem;
	}

	dd {
		margin: 0;
	}

	.muted {
		color: var(--ink-muted);
	}

	table {
		border-collapse: collapse;
		font-size: 0.85rem;
		width: 100%;
	}

	th,
	td {
		text-align: left;
		padding: 2px var(--space-2);
		border-bottom: 1px solid var(--rule);
		vertical-align: top;
	}

	tr.pass td {
		background: var(--c-prob-tint);
	}
</style>
