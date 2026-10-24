<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';

	const data = useDataset('prompts/fewshot');
	let task = $state(0);
	let model = $state<'qwen' | 'gpt2'>('qwen');
	let shots = $state(4);
</script>

<WidgetFrame
	title="Learning from examples"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct and GPT-2 small' }}
	onreset={() => {
		task = 0;
		model = 'qwen';
		shots = 4;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const t = d.tasks[task]}
			{@const first = t.tests[0].runs.find((r) => r.shots === shots)!}
			<div class="controls">
				<Choice
					legend="Task"
					options={d.tasks.map((t, i) => ({ value: i, label: t.name }))}
					bind:value={task}
				/>
				<Choice
					legend="Examples in the prompt"
					options={d.shots.map((n) => ({ value: n, label: String(n) }))}
					bind:value={shots}
				/>
				<Choice
					legend="Model"
					options={(['qwen', 'gpt2'] as const).map((m) => ({
						value: m,
						label: d.models[m].displayName
					}))}
					bind:value={model}
				/>
			</div>

			<p class="label">The prompt, for “{t.tests[0].query}”</p>
			<pre class="prompt">{first.text}<span class="gap" aria-hidden="true"> ___</span></pre>

			<table class="data">
				<caption>
					Chance that {d.models[model].displayName} answers right, by number of examples
				</caption>
				<thead>
					<tr>
						<th scope="col">Word</th>
						<th scope="col">Right answer</th>
						{#each d.shots as n (n)}
							<th scope="col" class="num" class:on={n === shots}>{n} example{n === 1 ? '' : 's'}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each t.tests as test (test.query)}
						<tr>
							<th scope="row" class="mono">{test.query}</th>
							<td class="mono answer">{test.answer}</td>
							{#each test.runs as r (r.shots)}
								<td class="heat" class:on={r.shots === shots} style:--p={r[model]}
									>{formatPercent(r[model])}</td
								>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="note">
				No weights change between the columns: the only difference is how many examples sit in the
				prompt. With none, the model has no way to know what “->” is asking for.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.controls {
		--control-space: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		margin-bottom: var(--space-3);
	}

	.prompt {
		margin: var(--space-1) 0 var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		font-size: 0.85rem;
		white-space: pre-wrap;
	}

	.gap {
		color: var(--c-token-ink);
	}

	td.answer {
		text-align: left;
		color: var(--ink-muted);
	}

	th.on,
	td.on {
		font-weight: 700;
		outline: 2px solid var(--c-prob);
		outline-offset: -2px;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
