<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { canonical } from '#lib/models/provider.ts';
	import { all, then, useDataset } from '#lib/datasets/use.ts';

	const LABELS = ['0', '0.7', '1.5'];
	const runs = then(
		all([
			useDataset('traces/the-cat-sat-t00'),
			useDataset('traces/the-cat-sat-t07'),
			useDataset('traces/the-cat-sat-t15')
		]),
		(traces) => traces.map((trace, i) => ({ label: LABELS[i], trace }))
	);
</script>

<WidgetFrame
	title="Same prompt, three temperatures"
	label="Recorded runs"
	source={{ kind: 'recorded', model: canonical.displayName }}
>
	<Loading promise={runs}>
		{#snippet children(list)}
			<div class="runs">
				{#each list as { label, trace } (label)}
					<figure>
						<figcaption class="label">Temperature {label}</figcaption>
						<p>
							<strong>{trace.prompt}</strong>{trace.steps.map((s) => s.chosen.text).join('')}…
						</p>
					</figure>
				{/each}
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.runs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
	}

	figure {
		margin: 0;
		padding: var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	p {
		margin: var(--space-2) 0 0;
		white-space: pre-wrap;
	}
</style>
