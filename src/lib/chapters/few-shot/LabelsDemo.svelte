<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import { summarizeLabels, type LabelsModel } from './labels.ts';

	const DEFAULT = 'correct';
	const MODELS: LabelsModel[] = ['qwen', 'gpt2'];
	const data = useDataset('prompts/labels');
	let condition = $state(DEFAULT);
</script>

<WidgetFrame
	title="Do the labels have to be right?"
	label="Recorded runs"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct and GPT-2 small' }}
	onreset={() => (condition = DEFAULT)}
>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const c = rec.conditions.find((x) => x.id === condition)!}
			<Choice
				legend="The eight examples"
				options={rec.conditions.map((x) => ({ value: x.id, label: x.name }))}
				bind:value={condition}
			/>

			{#if c.shown.length}
				<ol class="examples" aria-label="The examples in the prompt">
					{#each rec.examples as e, i (i)}
						{@const wrong = c.labels[0] === 'positive' && c.shown[i] !== e.label}
						<li class:wrong>
							<span class="review">{e.text}</span>
							<span class="mono label">{c.shown[i]}</span>
							{#if wrong}<span class="note">wrong</span>{/if}
						</li>
					{/each}
				</ol>
			{:else}
				<p class="examples-none">No examples: just the review, then "Sentiment:".</p>
			{/if}

			<ScrollBox label="How each model labeled the new reviews">
				<table>
					<caption class="visually-hidden"
						>How each model labeled {rec.tests.length} new reviews</caption
					>
					<thead>
						<tr>
							<th scope="col">Model</th>
							<th scope="col">Chance of answering “{c.labels[0]}” or “{c.labels[1]}”</th>
							<th scope="col">Labels by the real sentiment</th>
							<th scope="col">Follows the examples’ labels</th>
						</tr>
					</thead>
					<tbody aria-live="polite">
						{#each MODELS as m (m)}
							{@const s = summarizeLabels(rec, m, condition)}
							{@const follows =
								condition === 'flipped'
									? s.tests - s.realSentiment
									: condition === 'none' || condition === 'half-wrong'
										? null
										: s.realSentiment}
							<tr>
								<th scope="row">{rec.models[m].displayName}</th>
								<td class="mono">{formatPercent(s.labelShare)}</td>
								<td>
									<span class="mono">{s.realSentiment}</span> of {s.tests}
									{#if s.sameForAll}<span class="muted">(same label for every review)</span>{/if}
								</td>
								<td>
									{#if follows === null}<span class="muted">no single rule</span>{:else}<span
											class="mono">{follows}</span
										>
										of {s.tests}{/if}
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
	.examples {
		display: grid;
		gap: 2px;
		margin: var(--space-3) 0;
		padding-left: 1.5rem;
		font-size: 0.9rem;
	}

	.examples li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
	}

	.label {
		color: var(--c-token-ink);
	}

	.wrong .label {
		color: var(--c-loss-ink);
	}

	.note {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--c-loss-ink);
	}

	.examples-none {
		margin: var(--space-3) 0;
		color: var(--ink-muted);
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
		vertical-align: top;
	}

	thead th {
		font-weight: 600;
		font-size: 0.8rem;
	}

	.muted {
		color: var(--ink-muted);
	}
</style>
