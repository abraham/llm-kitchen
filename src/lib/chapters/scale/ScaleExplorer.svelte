<script lang="ts">
	import Cite from '#lib/components/page/Cite.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { SCALE, formatCount, formatPower, type ScaleEntry } from './data.ts';

	const METRICS = {
		parameters: { label: 'Weights', unit: 'numbers learned', format: formatCount },
		trainingTokens: {
			label: 'Training text',
			unit: 'tokens read in training',
			format: formatCount
		},
		flops: { label: 'Compute', unit: 'arithmetic operations', format: formatPower }
	} as const;
	type Metric = keyof typeof METRICS;

	let metric = $state<Metric>('parameters');
	const id = $props.id();

	const values = $derived(SCALE.map((e) => e[metric]).filter((v): v is number => v !== undefined));
	const lo = $derived(Math.floor(Math.log10(Math.min(...values))));
	const hi = $derived(Math.ceil(Math.log10(Math.max(...values))));
	const width = (v: number) => ((Math.log10(v) - lo + 0.3) / (hi - lo + 0.3)) * 100;
	const ratio = $derived(Math.max(...values) / Math.min(...values));

	function value(e: ScaleEntry) {
		return e[metric];
	}
</script>

<WidgetFrame
	title="How big is big?"
	source={{ kind: 'computed' }}
	onreset={() => (metric = 'parameters')}
>
	<fieldset class="metric">
		<legend class="label">Compare</legend>
		{#each Object.entries(METRICS) as [key, m] (key)}
			<label
				><input type="radio" name="{id}-metric" bind:group={metric} value={key} /> {m.label}</label
			>
		{/each}
	</fieldset>

	<table>
		<caption class="visually-hidden">{METRICS[metric].label} of each model, on a log scale</caption>
		<thead>
			<tr>
				<th scope="col">Model</th>
				<th scope="col">{METRICS[metric].label} ({METRICS[metric].unit})</th>
			</tr>
		</thead>
		<tbody>
			{#each SCALE as e (e.name)}
				{@const v = value(e)}
				<tr>
					<th scope="row">
						{e.name}{#if e.year}<span class="year"> {e.year}</span>{/if}{#if e.cite}<Cite
								id={e.cite}
							/>{/if}
					</th>
					<td>
						{#if v === undefined}
							<span class="missing">not published</span>
						{:else}
							<span class="row">
								<span class="track"><span class="bar" style:width="{width(v)}%"></span></span>
								<span class="mono value">{METRICS[metric].format(v)}</span>
							</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="readout" aria-live="polite">
		Each step on this scale is 10 times the last. The biggest is about
		<strong>{formatPower(ratio)}</strong> times the smallest.
	</p>
</WidgetFrame>

<style>
	.metric {
		border: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	legend {
		float: left;
		margin-right: var(--space-2);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		text-align: left;
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--rule);
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--ink-muted);
		font-weight: 600;
	}

	tbody th {
		font-weight: 500;
		white-space: nowrap;
		width: 13rem;
	}

	.year {
		margin-left: 0.35em;
		color: var(--ink-muted);
		font-weight: 400;
		font-size: 0.8rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.track {
		flex: 1;
		min-width: 6rem;
	}

	.bar {
		display: block;
		height: 0.9rem;
		background: var(--c-weight);
		border-radius: 2px;
		transition: width var(--duration) var(--ease);
	}

	.value {
		width: 7.5rem;
		font-size: 0.85rem;
	}

	.missing {
		color: var(--ink-muted);
		font-style: italic;
	}

	.readout {
		margin: var(--space-3) 0 0;
	}

	/* On phones, let names wrap and put each value under its bar. */
	@media (max-width: 40rem) {
		tbody th {
			width: 40%;
			white-space: normal;
		}

		.row {
			flex-wrap: wrap;
			gap: 2px;
		}

		.track {
			flex-basis: 100%;
		}

		.value {
			width: auto;
		}
	}
</style>
