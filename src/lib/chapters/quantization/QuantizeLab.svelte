<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import { annotateWeightBits, formatWeight, levels, type BitField } from '#lib/math/quantize.ts';
	import { scaleLinear } from '#lib/math/scale.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = useDataset('quantize/precisions');
	let index = $state(0);
	let weightChoice = $state<'typical' | 'small' | 'max'>('typical');
	let pickedField = $state<string | null>(null);

	const MAX_W = 576;
	let W = $state(MAX_W);
	const H = 96;
	const PAD = 8;
	const ROW = { trained: 28, rounded: 72 };
	const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;

	function pickWeights(row: readonly number[]) {
		let maxIdx = 0;
		let smallIdx = 0;
		for (let i = 1; i < row.length; i++) {
			if (Math.abs(row[i]) > Math.abs(row[maxIdx])) maxIdx = i;
			if (
				Math.abs(row[i]) > 0 &&
				(Math.abs(row[smallIdx]) === 0 || Math.abs(row[i]) < Math.abs(row[smallIdx]))
			) {
				smallIdx = i;
			}
		}
		return [
			{ key: 'typical' as const, label: 'Typical', index: 0 },
			{ key: 'small' as const, label: 'Smallest', index: smallIdx },
			{ key: 'max' as const, label: 'Largest', index: maxIdx }
		];
	}

	function resolveField(fields: readonly BitField[]): BitField {
		if (pickedField) {
			const match = fields.find((f) => f.id === pickedField);
			if (match) return match;
		}
		return (
			fields.find((f) => f.id === 'int-val' || f.id === 'frac-dropped' || f.id === 'fraction') ??
			fields[0]
		);
	}
</script>

<WidgetFrame
	title="Rounding GPT-2's numbers"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => {
		index = 0;
		weightChoice = 'typical';
		pickedField = null;
	}}
>
	<Loading promise={data}>
		{#snippet children(run)}
			{@const full = run.precisions[0]}
			{@const p = run.precisions[index]}
			{@const max = run.sample.max * 1.05}
			{@const x = scaleLinear([-max, max], [PAD, W - 8])}
			{@const grid = p.kind === 'int' ? levels(p.bits, run.sample.max) : []}
			{@const same = p.generated.every((t, i) => t.id === full.generated[i].id)}
			{@const weightOptions = pickWeights(full.row)}
			{@const activeWeight = weightOptions.find((w) => w.key === weightChoice) ?? weightOptions[0]}
			{@const origW = full.row[activeWeight.index]}
			{@const roundW = p.row[activeWeight.index]}
			{@const errW = Math.abs(origW - roundW)}
			{@const bitFields = annotateWeightBits(
				origW,
				roundW,
				p,
				run.sample.max,
				run.block,
				run.scaleBits
			)}
			{@const selectedField = resolveField(bitFields)}
			<div class="bits">
				<Slider
					label="Bits per number"
					min={0}
					max={run.precisions.length - 1}
					format={(v) => String(run.precisions[run.precisions.length - 1 - v].bits)}
					valueText={(v) => `${run.precisions[run.precisions.length - 1 - v].bits} bits`}
					concept="weight"
					bind:value={
						() => run.precisions.length - 1 - index,
						(v) => {
							index = run.precisions.length - 1 - v;
							pickedField = null;
						}
					}
				/>
			</div>

			<div class="size">
				<span class="label">Weights</span>
				<span class="bar"><span style:width="{(p.bytes / full.bytes) * 100}%"></span></span>
				<span class="mono">{mb(p.bytes)}</span>
			</div>

			<figure class="row">
				<p class="legend" aria-hidden="true">
					<span><span class="dot trained-dot"></span>as trained (top)</span>
					<span><span class="dot rounded-dot"></span>{p.label} (bottom)</span>
				</p>
				<Figure
					max={MAX_W}
					bind:width={W}
					height={H}
					label={p.kind === 'int'
						? `${run.block} weights before and after rounding: each can only take one of ${grid.length} values`
						: `${run.block} weights before and after rounding to ${p.bits}-bit floats: they barely move`}
				>
					{#each grid.length <= 64 ? grid : [] as g, i (i)}
						<line class="level" x1={x(g)} x2={x(g)} y1="14" y2={H - 10} />
					{/each}
					{#each full.row as v, i (i)}
						{@const isSelected = i === activeWeight.index}
						<line
							class="move"
							class:selected-move={isSelected}
							x1={x(v)}
							y1={ROW.trained}
							x2={x(p.row[i])}
							y2={ROW.rounded}
						/>
						<circle
							class="trained"
							class:selected-dot={isSelected}
							cx={x(v)}
							cy={ROW.trained}
							r={isSelected ? 5 : 3.5}
						/>
						<circle
							class="rounded"
							class:selected-dot={isSelected}
							cx={x(p.row[i])}
							cy={ROW.rounded}
							r={isSelected ? 5 : 3.5}
						/>
					{/each}
				</Figure>
				<figcaption>
					{#if p.kind === 'int'}
						{run.block} of GPT-2's weights. At {p.bits} bits, each group of {run.block} can only take
						{grid.length} values (the grey lines{grid.length > 64
							? ', too close together to draw'
							: ''}), set by its largest number.
					{:else}
						{run.block} of GPT-2's weights. {p.bits}-bit floats keep
						{p.bits === 32 ? 'about 7' : 'about 3'} significant digits, so the weights {p.bits ===
						32
							? "don't move"
							: 'barely move'}.
					{/if}
				</figcaption>
			</figure>

			<div class="inspector">
				<div class="weight-picks" role="group" aria-label="Weight to inspect">
					<span class="label">Inspect one weight</span>
					{#each weightOptions as opt (opt.key)}
						<button
							type="button"
							aria-pressed={weightChoice === opt.key}
							onclick={() => {
								weightChoice = opt.key;
								pickedField = null;
							}}
						>
							{opt.label} <span class="mono">({formatWeight(full.row[opt.index], 3)})</span>
						</button>
					{/each}
				</div>

				<div class="bit-strip" role="group" aria-label="Bit layout for the selected weight">
					{#each bitFields as field (field.id)}
						<button
							type="button"
							class="field {field.kind}"
							class:dropped={field.dropped}
							aria-pressed={selectedField.id === field.id}
							onclick={() => (pickedField = field.id)}
						>
							<span class="field-head">
								{field.dropped ? '− ' : ''}{field.label}
							</span>
							<span class="field-bits mono">{field.bits}</span>
							<span class="visually-hidden">
								{field.dropped ? 'dropped' : 'kept'}, {field.summary}
							</span>
						</button>
					{/each}
				</div>

				<dl class="detail" aria-label="Selected weight rounding summary">
					<div>
						<dt class="label">Value</dt>
						<dd class="diff mono">
							{#if errW === 0}
								<strong>{formatWeight(origW)}</strong>
								<span class="muted">(unchanged)</span>
							{:else}
								<span class="old">{formatWeight(origW)}</span>
								<span aria-hidden="true">→</span>
								<span class="kept-val">{formatWeight(roundW)}</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt class="label">Rounding error</dt>
						<dd class="mono">
							<strong>{formatWeight(errW)}</strong>
							{#if Math.abs(roundW) < 1e-9 && Math.abs(origW) >= 1e-9}
								<span class="muted">(rounded to 0)</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt class="label">Bits stored</dt>
						<dd class="mono">
							{#if p.kind === 'int'}
								<strong>{p.bits}</strong> + {run.scaleBits / run.block} scale
								<span class="muted">({32 - p.bits} fewer)</span>
							{:else if p.bits === 16}
								<strong>16</strong> <span class="muted">(16 dropped)</span>
							{:else}
								<strong>32</strong> <span class="muted">(full precision)</span>
							{/if}
						</dd>
					</div>
				</dl>

				<Status lines={2}>{selectedField.summary}</Status>
			</div>

			<div class="results">
				<ProbBars
					caption="Next word after “{run.prompt}”"
					bars={p.candidates.map((c) => ({ label: displayToken(c.token.text), p: c.prob }))}
				/>
				<div>
					<p class="label">GPT-2 continues</p>
					<p class="generated">
						{run.prompt}<strong
							>{p.generated
								.map((t) => t.text)
								.join('')
								.split('\n')[0]}</strong
						>…
					</p>
					<p class="verdict">
						{#if index === 0}
							The weights as trained.
						{:else if same}
							Same words as the weights as trained.
						{:else}
							Different words from the weights as trained.
						{/if}
						Loss on a test passage: <span class="mono">{p.loss.toFixed(2)}</span>
						{#if index > 0}(as trained: <span class="mono">{full.loss.toFixed(2)}</span>){/if}
					</p>
				</div>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.bits {
		max-width: 24rem;
	}

	.size {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		font-size: 0.9rem;
	}

	.bar {
		height: 1rem;
		background: var(--surface-2);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--c-weight);
		transition: width var(--duration) var(--ease);
	}

	.row {
		margin: 0 0 var(--space-3);
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

	.trained-dot {
		background: var(--c-weight);
	}

	.rounded-dot {
		background: var(--c-loss);
	}

	.level {
		stroke: var(--rule);
	}

	.move {
		stroke: var(--ink-muted);
		stroke-width: 0.75;
	}

	.selected-move {
		stroke: var(--ink);
		stroke-width: 2;
	}

	.trained {
		fill: var(--c-weight);
	}

	.rounded {
		fill: var(--c-loss);
	}

	.selected-dot {
		stroke: var(--ink);
		stroke-width: 1.5;
	}

	figcaption {
		font-size: 0.9rem;
		color: var(--ink-muted);
	}

	.inspector {
		margin: 0 0 var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--rule);
	}

	.weight-picks {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.weight-picks button[aria-pressed='true'] {
		border-color: var(--c-weight);
		background: var(--c-weight-tint);
		color: var(--c-weight-ink);
	}

	.bit-strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: var(--space-2);
	}

	.field {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 3.2rem;
		max-width: 100%;
		padding: var(--space-1) var(--space-2);
		border: 1.5px solid var(--c-weight);
		border-radius: var(--radius);
		background: var(--c-weight-tint);
		color: var(--c-weight-ink);
		text-align: left;
		line-height: 1.25;
		transition:
			transform var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}

	.field.scale {
		border-style: dashed;
		border-color: var(--rule);
		background: var(--surface-2);
		color: var(--ink);
	}

	.field.dropped {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.field.dropped .field-bits {
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.field[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.field-head {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 600;
	}

	.field-bits {
		font-size: 0.9rem;
		overflow-wrap: anywhere;
	}

	.detail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.detail dt {
		margin-bottom: 2px;
	}

	.detail dd {
		margin: 0;
		font-size: 0.95rem;
		overflow-wrap: anywhere;
	}

	.diff {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.old {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		text-decoration: line-through;
		font-size: 0.85rem;
	}

	.kept-val {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-weight);
		background: var(--c-weight-tint);
		color: var(--c-weight-ink);
		font-size: 0.85rem;
	}

	.muted {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.results {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 44rem) {
		.results {
			grid-template-columns: 1fr 1fr;
		}
	}

	.results p {
		margin: 0 0 var(--space-2);
	}

	.generated {
		white-space: pre-wrap;
	}

	.generated strong {
		color: var(--c-weight-ink);
	}

	.verdict {
		font-size: 0.9rem;
		color: var(--ink-muted);
	}
</style>
