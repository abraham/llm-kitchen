<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { canonical } from '#lib/models/provider.ts';
	import { loadTrace } from '#lib/models/load-trace.ts';

	const runs = Promise.all(
		[
			['the-cat-sat-t00', '0'],
			['the-cat-sat-t07', '0.7'],
			['the-cat-sat-t15', '1.5']
		].map(async ([name, label]) => ({ label, trace: await loadTrace(name) }))
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
