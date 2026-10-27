<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';

	const data = useDataset('prompts/rules');
	let count = $state(10);
	let note = $state(0);
</script>

<WidgetFrame
	title="How many rules at once?"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => ((count = 10), (note = 0))}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const n = d.notes.length}
			{@const at = (k: number) => d.notes.map((x) => x.runs[d.counts.indexOf(k)])}
			{@const run = at(count)[note]}
			<table class="data">
				<caption>{n} short notes, each written under 1 to 10 rules</caption>
				<thead>
					<tr>
						<th scope="col">Rules</th>
						<th scope="col" class="num">Rules kept</th>
						<th scope="col" class="num">Notes that kept every rule</th>
					</tr>
				</thead>
				<tbody>
					{#each d.counts as k (k)}
						{@const runs = at(k)}
						{@const kept = runs.reduce((s, r) => s + r.followed.filter(Boolean).length, 0)}
						<tr class:picked={k === count}>
							<th scope="row">{k}</th>
							<td class="num">{formatPercent(kept / (k * n))}</td>
							<td class="num">{runs.filter((r) => r.followed.every(Boolean)).length} of {n}</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<Choice
				legend="Rules"
				options={d.counts.map((k) => ({ value: k, label: String(k) }))}
				bind:value={count}
			/>
			<Choice
				legend="Note"
				appearance="select"
				options={d.notes.map((x, i) => ({
					value: i,
					label: x.task.replace('Write a short note ', '')
				}))}
				bind:value={note}
			/>

			<div aria-live="polite">
				<p class="kept">
					It kept {run.followed.filter(Boolean).length} of {run.rules.length}
					{run.rules.length === 1 ? 'rule' : 'rules'}.
				</p>
				<ol class="rules">
					{#each run.rules as r, i (r)}
						<li class:missed={!run.followed[i]}>
							<span aria-hidden="true">{run.followed[i] ? '✓' : '✗'}</span>
							{d.rules[r]}
							<span class="visually-hidden">{run.followed[i] ? '(kept)' : '(missed)'}</span>
						</li>
					{/each}
				</ol>
				<blockquote class="reply">{run.reply}</blockquote>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	table {
		margin-bottom: var(--space-3);
	}

	tr.picked {
		background: var(--surface-2);
	}

	.kept {
		font-size: 0.9rem;
		margin: var(--space-2) 0 var(--space-1);
	}

	.rules {
		font-size: 0.85rem;
		margin: 0 0 var(--space-2);
		padding-left: 1.5rem;
	}

	.rules li.missed {
		color: var(--c-loss-ink);
	}

	.reply {
		margin: 0;
		padding: var(--space-2);
		white-space: pre-wrap;
		font-size: 0.9rem;
		background: var(--surface-2);
		border-radius: var(--radius);
	}
</style>
