<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { softmax } from '#lib/math/sampling.ts';

	import { canonical } from '#lib/models/provider.ts';

	const SHOWN = 6;
	const trace = useDataset('traces/the-cat-sat');
	let temperature = $state(1);

	const fmt = (x: number) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
</script>

<WidgetFrame
	title="Divide by the temperature"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => (temperature = 1)}
>
	<Loading promise={trace}>
		{#snippet children(t)}
			{@const words = t.steps[0].candidates.slice(0, SHOWN)}
			{@const scores = words.map((c) => Math.log(c.prob))}
			{@const scaled = scores.map((s) => s / temperature)}
			{@const probs = softmax(scores, temperature)}
			{@const gap = scores[0] - scores[1]}
			<Slider
				label="Temperature"
				layout="inline"
				min={0.1}
				max={2}
				step={0.05}
				format={(v) => v.toFixed(2)}
				concept="prob"
				bind:value={temperature}
			/>

			<table>
				<caption class="visually-hidden">
					Each word's score, divided by the temperature, and the probability that results
				</caption>
				<thead>
					<tr>
						<th scope="col">Word</th>
						<th scope="col" class="num">Score</th>
						<th scope="col" class="num">÷ {temperature.toFixed(2)}</th>
						<th scope="col">Probability</th>
					</tr>
				</thead>
				<tbody>
					{#each words as w, i (w.token.id)}
						<tr>
							<th scope="row" class="mono">{displayToken(w.token.text)}</th>
							<td class="mono">{fmt(scores[i])}</td>
							<td class="mono">{fmt(scaled[i])}</td>
							<td class="cell">
								<span class="prob">
									<span class="bar"><span style:width="{probs[i] * 100}%"></span></span>
									<span class="mono pct">{formatPercent(probs[i])}</span>
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<Status>
				The top two scores are {gap.toFixed(2)} apart. Divided by {temperature.toFixed(2)}, the gap
				becomes {(gap / temperature).toFixed(2)}, so
				<span class="mono">{displayToken(words[0].token.text)}</span> is
				<strong>{Math.exp(gap / temperature).toFixed(2)}×</strong> as likely as
				<span class="mono">{displayToken(words[1].token.text)}</span>.
			</Status>
			<p class="note">
				Each divided score <i>s</i> becomes <i>e<sup>s</sup></i>, and those are shared out to add up
				to 100%. A small temperature stretches the gaps, so the top word pulls ahead; a large one
				shrinks them, so the chances even out. Scores here are the logs of GPT-2’s probabilities,
				using only its top {SHOWN} words. Its real raw scores differ from these by the same amount for
				every word, which doesn’t change the result.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		text-align: left;
		padding: 2px var(--space-2);
		border-bottom: 1px solid var(--rule);
		white-space: nowrap;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink-muted);
	}

	tbody th {
		font-weight: 400;
	}

	td.mono,
	th.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.cell {
		width: 50%;
	}

	.prob {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.bar {
		flex: 1;
		height: 0.7rem;
		background: var(--c-prob-tint);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--c-prob);
		transition: width var(--duration) var(--ease);
	}

	.pct {
		width: 3.5rem;
		text-align: right;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
