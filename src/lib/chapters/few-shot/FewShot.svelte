<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';

	const data = useDataset('prompts/fewshot');
	const id = $props.id();
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
				<fieldset>
					<legend class="label">Task</legend>
					{#each d.tasks as option, i (option.name)}
						<label
							><input type="radio" name="{id}-task" value={i} bind:group={task} />
							{option.name}</label
						>
					{/each}
				</fieldset>
				<fieldset>
					<legend class="label">Examples in the prompt</legend>
					{#each d.shots as n (n)}
						<label><input type="radio" name="{id}-shots" value={n} bind:group={shots} /> {n}</label>
					{/each}
				</fieldset>
				<fieldset>
					<legend class="label">Model</legend>
					{#each ['qwen', 'gpt2'] as const as m (m)}
						<label
							><input type="radio" name="{id}-model" value={m} bind:group={model} />
							{d.models[m].displayName}</label
						>
					{/each}
				</fieldset>
			</div>

			<p class="label">The prompt, for “{t.tests[0].query}”</p>
			<pre class="prompt">{first.text}<span class="gap" aria-hidden="true"> ___</span></pre>

			<table>
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
								<td class:on={r.shots === shots} style:--p={r[model]}>{formatPercent(r[model])}</td>
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
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		margin-bottom: var(--space-3);
	}

	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		width: 100%;
		padding: 0;
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

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	caption {
		text-align: left;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin-bottom: var(--space-1);
	}

	th,
	td {
		padding: 2px var(--space-2);
		border-bottom: 1px solid var(--rule);
		text-align: left;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		color: var(--ink-muted);
	}

	th.num,
	td {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	td.answer {
		text-align: left;
		color: var(--ink-muted);
	}

	td {
		background: color-mix(in oklch, var(--c-prob-tint) calc(var(--p, 0) * 100%), transparent);
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
