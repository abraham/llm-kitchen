<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { softmax } from '#lib/math/sampling.ts';
	import { loadTrace } from '#lib/models/load-trace.ts';
	import { canonical } from '#lib/models/provider.ts';

	const SHOWN = 6;
	const id = $props.id();
	const trace = loadTrace('the-cat-sat');
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
			<div class="slider">
				<label class="label" for="{id}-t">
					Temperature <span class="mono" aria-hidden="true">{temperature.toFixed(2)}</span>
				</label>
				<input id="{id}-t" type="range" min="0.1" max="2" step="0.05" bind:value={temperature} />
			</div>

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

			<p class="readout" aria-live="polite">
				The top two scores are {gap.toFixed(2)} apart. Divided by {temperature.toFixed(2)}, the gap
				becomes {(gap / temperature).toFixed(2)}, so
				<span class="mono">{displayToken(words[0].token.text)}</span> is
				<strong>{Math.exp(gap / temperature).toFixed(2)}×</strong> as likely as
				<span class="mono">{displayToken(words[1].token.text)}</span>.
			</p>
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
	.slider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-3);
	}

	input[type='range'] {
		accent-color: var(--c-prob);
		min-width: 12rem;
	}

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

	.readout {
		margin: var(--space-3) 0 0;
		min-height: 3em;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
