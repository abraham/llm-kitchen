<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Axis from '#lib/components/ui/Axis.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import FigureData from '#lib/components/ui/FigureData.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import { scaleLinear, scaleLog } from '#lib/math/scale.ts';
	import { formatCount, kaplanLoss } from './data.ts';
	import { GPT2_FAMILY, nonEmbeddingParameters } from '#lib/math/transformer.ts';

	const MAX_W = 560;
	let W = $state(MAX_W);
	const H = 300;
	const PAD = { left: 52, right: 16, top: 16, bottom: 44 };
	const X0 = 3;
	const X1 = 12;
	const FIT_MIN = 768;
	const FIT_MAX = 1.5e9;
	const Y0 = 1.25;
	const Y1 = 7;

	const sx = $derived(scaleLog([10 ** X0, 10 ** X1], [PAD.left, W - PAD.right]));
	const sy = scaleLinear([Y0, Y1], [H - PAD.bottom, PAD.top]);
	const path = (from: number, to: number) => {
		const pts: string[] = [];
		for (let e = Math.log10(from); e <= Math.log10(to) + 1e-9; e += 0.05) {
			pts.push(`${sx(10 ** e).toFixed(1)},${sy(kaplanLoss(10 ** e)).toFixed(1)}`);
		}
		return pts.length ? `M${pts.join('L')}` : '';
	};
	const superscript = (n: number) =>
		`10${String(Math.round(Math.log10(n))).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}`;

	const START = 6;
	let exponent = $state(START);
	const n = $derived(10 ** exponent);
	const loss = $derived(kaplanLoss(n));
	const lossTicks = [2, 3, 4, 5, 6, 7];
	// The label reserves room for its longest value, so the slider after it stays put.
	const widest = Math.max(
		...Array.from(
			{ length: (X1 - X0) / 0.05 + 1 },
			(_, i) => formatCount(10 ** (X0 + i * 0.05)).length
		)
	);
</script>

<WidgetFrame
	title="The scaling curve"
	source={{ kind: 'computed' }}
	onreset={() => (exponent = START)}
>
	<Figure
		max={MAX_W}
		bind:width={W}
		height={H}
		label="Predicted loss falls along a smooth curve as the number of weights grows from a thousand to a trillion."
	>
		<Axis
			scale={sx}
			side="bottom"
			at={H - PAD.bottom}
			grid={PAD.top}
			count={Math.floor((W - PAD.left - PAD.right) / 36)}
			format={superscript}
			label="Weights, not counting the token tables (log scale)"
			labelAt={H - 6}
		/>
		<Axis
			scale={sy}
			side="left"
			at={PAD.left}
			grid={W - PAD.right}
			ticks={lossTicks}
			label="Loss"
			labelAt={14}
		/>

		<path d={path(10 ** X0, FIT_MIN)} class="curve extrapolated" />
		<path d={path(FIT_MIN, FIT_MAX)} class="curve" />
		<path d={path(FIT_MAX, 10 ** X1)} class="curve extrapolated" />

		{#each GPT2_FAMILY as m (m.name)}
			{@const ne = nonEmbeddingParameters(m)}
			<circle cx={sx(ne)} cy={sy(kaplanLoss(ne))} r="4" class="model" />
		{/each}
		<text
			x={sx(nonEmbeddingParameters(GPT2_FAMILY[1]))}
			y={sy(kaplanLoss(nonEmbeddingParameters(GPT2_FAMILY[1]))) - 14}
			class="tick">GPT-2 sizes</text
		>

		<line x1={sx(n)} x2={sx(n)} y1={PAD.top} y2={H - PAD.bottom} class="cursor" />
		<circle cx={sx(n)} cy={sy(loss)} r="6" class="you" />
	</Figure>
	<FigureData>
		<table class="data">
			<caption>Predicted loss for the four GPT-2 sizes</caption>
			<thead>
				<tr><th scope="col">Model</th><th scope="col">Weights</th><th scope="col">Loss</th></tr>
			</thead>
			<tbody>
				{#each GPT2_FAMILY as m (m.name)}
					{@const ne = nonEmbeddingParameters(m)}
					<tr>
						<th scope="row">{m.name}</th>
						<td>{formatCount(ne)}</td>
						<td>{kaplanLoss(ne).toFixed(2)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</FigureData>

	<div class="weights">
		<Slider
			label="Weights:"
			layout="inline"
			min={X0}
			max={X1}
			step={0.05}
			format={(e) => formatCount(10 ** e)}
			concept="loss"
			width={widest}
			bind:value={exponent}
		/>
	</div>
	<Status>
		Predicted loss: <strong class="mono">{loss.toFixed(2)}</strong>. On average, the right next
		token gets a probability of about <strong>{formatPercent(Math.exp(-loss))}</strong>.
		{#if n < FIT_MIN || n > FIT_MAX}
			<em>This size is outside the range the formula was fitted on (dashed), so it's a guess.</em>
		{/if}
	</Status>
	<p class="note">
		Formula from Kaplan et al. (2020), for models trained on plenty of text. Dots mark the four
		GPT-2 sizes on the formula's line, not their measured results.
	</p>
</WidgetFrame>

<style>
	.tick {
		font-size: 11px;
		fill: var(--ink-muted);
		text-anchor: middle;
	}

	.curve {
		fill: none;
		stroke: var(--c-loss);
		stroke-width: 2.5;
	}

	.curve.extrapolated {
		stroke-dasharray: 5 4;
		stroke-width: 1.5;
	}

	.model {
		fill: var(--surface);
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.cursor {
		stroke: var(--ink-muted);
		stroke-dasharray: 2 3;
	}

	.you {
		fill: var(--c-loss);
	}

	.weights {
		margin-top: var(--space-2);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
