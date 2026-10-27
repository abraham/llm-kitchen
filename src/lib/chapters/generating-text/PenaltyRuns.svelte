<script lang="ts">
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { canonical } from '#lib/models/provider.ts';
	import { all, andThen, useDataset } from '#lib/datasets/use.ts';
	import { markRepeats } from './penalty.ts';

	const LABELS = ['No penalty', 'Frequency penalty 0.5', 'Frequency penalty 5'];
	const runs = andThen(
		all([
			useDataset('traces/penalty-0'),
			useDataset('traces/penalty-05'),
			useDataset('traces/penalty-5')
		]),
		(traces) => traces.map((trace, i) => ({ label: LABELS[i], trace }))
	);
</script>

<WidgetFrame
	title="Penalizing repeats"
	label="Recorded runs"
	source={{ kind: 'recorded', model: canonical.displayName }}
>
	<Loading promise={runs}>
		{#snippet children(list)}
			<div class="runs">
				{#each list as { label, trace } (label)}
					{@const tokens = markRepeats(trace.steps.map((s) => s.chosen.text))}
					<figure>
						<figcaption class="label">{label}</figcaption>
						<p>
							<strong>{trace.prompt}</strong>{#each tokens as t, i (i)}<span class:repeat={t.repeat}
									>{t.text}</span
								>{/each}…
						</p>
						<p class="count">
							{tokens.filter((t) => !t.repeat).length} different tokens of {tokens.length}
						</p>
					</figure>
				{/each}
			</div>
			<p class="note">
				Underlined tokens were already used earlier in the reply. All three runs always take the
				most likely token, after the penalty.
			</p>
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

	.repeat {
		text-decoration: underline;
		text-decoration-color: var(--c-loss);
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
	}

	.count,
	.note {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--ink-muted);
		white-space: normal;
	}
</style>
