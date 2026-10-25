<script lang="ts">
	import { all, andThen, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import type { AgentRun } from '#lib/harness/agent.ts';
	import { TEST_CASES, traceTotals } from '#lib/harness/evals.ts';
	import type { ToolCall } from '#lib/harness/tools.ts';

	const DEFAULT = 'inject-none';
	const data = andThen(all(TEST_CASES.map((c) => useDataset(`agent/${c.run}`))), (runs) =>
		Object.fromEntries(TEST_CASES.map((c, i) => [c.run, runs[i] as AgentRun]))
	);
	let selected = $state<string>(DEFAULT);

	const short = (text: string, n = 70) =>
		text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text;
	const callText = (call: ToolCall) =>
		short(`${call.name}(${Object.values(call.arguments).join(', ')})`, 48);
</script>

<WidgetFrame
	title="Everything one run did"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (selected = DEFAULT)}
>
	<Loading promise={data}>
		{#snippet children(runs)}
			{@const run = runs[selected]}
			{@const totals = traceTotals(run)}
			{@const most = Math.max(...run.steps.map((s) => s.promptTokens))}
			<Choice
				legend="Run"
				appearance="select"
				layout="inline"
				options={TEST_CASES.map((c) => ({ value: c.run, label: c.label }))}
				bind:value={selected}
			/>
			<p class="task"><span class="label">The task</span> “{run.task}”</p>

			<ScrollBox label="The trace">
				<table class="data">
					<caption>Each model call, in order, with the tool call it asked for</caption>
					<thead>
						<tr>
							<th scope="col" class="num">Call</th>
							<th scope="col" class="num">Tokens read</th>
							<th scope="col">The model wrote</th>
							<th scope="col">The tool returned</th>
						</tr>
					</thead>
					<tbody>
						{#each run.steps as s, i (i)}
							<tr>
								<th scope="row" class="num">{i + 1}</th>
								<td class="heat" style:--p={s.promptTokens / most}>{formatCount(s.promptTokens)}</td
								>
								{#if s.call}
									<td class="text mono">{callText(s.call)}</td>
									<td class="text mono" class:refused={s.blocked}>{short(s.result ?? '')}</td>
								{:else}
									<td class="text answer">Answer: {short(s.thought, 90)}</td>
									<td class="text muted">none</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</ScrollBox>

			<dl class="readouts" aria-live="polite">
				<div>
					<dt>Model calls</dt>
					<dd class="mono">{totals.modelCalls}</dd>
				</div>
				<div>
					<dt>Tool calls</dt>
					<dd class="mono">{totals.toolCalls}</dd>
				</div>
				<div>
					<dt>Tokens read in all</dt>
					<dd class="mono">{formatCount(totals.tokensRead)}</dd>
				</div>
				<div>
					<dt>Ended</dt>
					<dd>{run.finished ? 'with an answer' : `at the limit of ${run.maxSteps} calls`}</dd>
				</div>
			</dl>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.task {
		margin: 0 0 var(--space-2);
	}

	table {
		--heat: var(--c-token-tint);
	}

	td.text {
		text-align: left;
		font-variant-numeric: normal;
		overflow-wrap: anywhere;
	}

	td.mono {
		font-size: 0.8rem;
	}

	td.answer {
		background: var(--c-vector-tint);
	}

	td.refused {
		color: var(--c-loss-ink);
	}

	td.muted {
		color: var(--ink-muted);
	}

	.readouts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		margin: var(--space-3) 0 0;
		font-family: var(--font-sans);
		font-size: 0.85rem;
	}

	.readouts dt {
		color: var(--ink-muted);
		font-size: 0.75rem;
	}

	.readouts dd {
		margin: 0;
	}
</style>
