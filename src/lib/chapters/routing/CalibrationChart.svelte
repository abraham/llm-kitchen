<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import { calibration } from '#lib/harness/routing.ts';

	type Model = 'small' | 'big';
	const data = useDataset('routing/cascade');
	let model = $state<Model>('small');

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const band = (from: number, to: number) =>
		from === 0 ? `below ${pct(to)}` : to === 1 ? `${pct(from)} or more` : `${pct(from)}–${pct(to)}`;
</script>

<WidgetFrame
	title="Does sure mean right?"
	source={{ kind: 'recorded', model: 'Qwen2.5-Instruct, 0.5B and 1.5B' }}
	onreset={() => (model = 'small')}
>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const bands = calibration(rec, model)}
			{@const worst = bands
				.filter((b) => b.answers)
				.reduce((w, b) =>
					Math.abs(b.right / b.answers - b.confidence!) >
					Math.abs(w.right / w.answers - w.confidence!)
						? b
						: w
				)}
			<Choice
				legend="Model"
				options={[
					{ value: 'small', label: rec.small.displayName },
					{ value: 'big', label: rec.big.displayName }
				]}
				bind:value={model}
			/>
			<p class="legend" aria-hidden="true">
				<span><span class="key sure"></span>how sure it was, on average</span>
				<span><span class="key right"></span>how often it was right</span>
			</p>
			<table>
				<caption class="visually-hidden"
					>{rec[model].displayName}'s answers grouped by confidence: how many, how sure on average,
					and how many were right</caption
				>
				<thead>
					<tr>
						<th scope="col">Confidence</th>
						<th scope="col">Answers</th>
						<th scope="col">How sure, how often right</th>
					</tr>
				</thead>
				<tbody>
					{#each bands as b (b.from)}
						<tr>
							<th scope="row">{band(b.from, b.to)}</th>
							<td class="mono">{b.answers}</td>
							<td>
								{#if b.answers}
									<div class="pair">
										<span class="track" aria-hidden="true"
											><span class="bar sure" style:width={pct(b.confidence!)}></span></span
										>
										<span class="value">{pct(b.confidence!)} sure</span>
									</div>
									<div class="pair">
										<span class="track" aria-hidden="true"
											><span class="bar right" style:width={pct(b.right / b.answers)}></span></span
										>
										<span class="value"
											>{b.right} of {b.answers} right ({pct(b.right / b.answers)})</span
										>
									</div>
								{:else}
									<span class="muted">no answers</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<Status>
				Calibrated means the two bars match. The biggest gap for {rec[model].displayName}: answers
				{band(worst.from, worst.to)} sure were <strong>{pct(worst.confidence!)} sure</strong> on
				average and <strong>{pct(worst.right / worst.answers)} right</strong>.
			</Status>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: var(--space-2) 0 var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.key {
		display: inline-block;
		width: 0.9rem;
		height: 0.6rem;
		margin-right: var(--space-1);
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.85rem;
	}

	th,
	td {
		text-align: left;
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--rule);
		vertical-align: top;
	}

	tbody th {
		font-weight: 600;
		white-space: nowrap;
	}

	/* The label sits beside its bar, or wraps under it when the cell is narrow. */
	.pair {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--space-2);
		margin-bottom: 2px;
	}

	.track {
		flex: 1 1 6rem;
	}

	.bar {
		display: block;
		height: 0.7rem;
		min-width: 2px;
	}

	.sure,
	.key.sure {
		background: var(--c-prob);
	}

	.right,
	.key.right {
		background: var(--c-vector);
	}

	/* A fixed width keeps every track the same length, so the bars share one scale. */
	.value {
		flex: 0 0 9.5rem;
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.muted {
		color: var(--ink-muted);
	}
</style>
