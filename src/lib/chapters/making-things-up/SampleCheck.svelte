<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import {
		AGREE,
		consistencyCheck,
		groupAnswers,
		summarize,
		type SampledQuestion,
		type Verdict
	} from '#lib/harness/hallucination.ts';

	const DEFAULT = 'velmora';
	const data = useDataset('hallucination/samples');
	let selected = $state<string>(DEFAULT);
	let allowed = $state(false);

	const KIND = {
		known: 'A well-known answer',
		obscure: 'A less well-known answer',
		invented: 'Invented for this chapter: there is no right answer'
	};
	const markOf = (v: Verdict, q: SampledQuestion) =>
		v === 'right' ? '✓ right' : v === 'declined' ? 'declined' : q.truth ? '✗ wrong' : '✗ made up';

	function reset() {
		selected = DEFAULT;
		allowed = false;
	}
</script>

<WidgetFrame
	title="Ask it ten times"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={reset}
>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const prompt = allowed ? 'allowed' : 'plain'}
			{@const q = rec.questions.find((x) => x.id === selected)!}
			{@const answers = q.answers[prompt]}
			{@const groups = groupAnswers(answers)}
			{@const check = consistencyCheck(answers)}
			{@const all = summarize(rec.questions, prompt)}
			<Choice
				legend="Question"
				appearance="select"
				layout="inline"
				options={rec.questions.map((x) => ({ value: x.id, label: x.question }))}
				bind:value={selected}
			/>
			<Toggle label="Allow “I don’t know” in the system prompt" bind:checked={allowed} />

			<p class="system">
				<span class="label">System prompt</span>
				<span class="mono">{rec.prompts.find((p) => p.id === prompt)!.system}</span>
			</p>
			<p class="truth">
				{KIND[q.kind]}{#if q.truth}: <strong>{q.truth}</strong>{/if}.
			</p>

			<table class="data">
				<caption class="visually-hidden"
					>The {answers.length} answers, the same ones counted together</caption
				>
				<thead>
					<tr>
						<th scope="col">Answer</th>
						<th scope="col">Times</th>
						<th scope="col">Checked by code</th>
					</tr>
				</thead>
				<tbody aria-live="polite">
					{#each groups as g (g.text)}
						<tr>
							<th scope="row">{g.text}</th>
							<td>
								<span class="count mono">{g.count}</span>
								<span class="bar" style:--share={g.count / answers.length} aria-hidden="true"
								></span>
							</td>
							<td><span class="mark {g.verdict}">{markOf(g.verdict, q)}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>

			<p class="greedy">
				At temperature 0 it gives one answer every time:
				<strong>{q.greedy[prompt].text}</strong>
				<span class="mark {q.greedy[prompt].verdict}">{markOf(q.greedy[prompt].verdict, q)}</span>
			</p>

			<Status>
				{#if check.outcome === 'declined'}
					Most answers decline, so the harness tells you the model doesn’t know.
				{:else}
					<span class="mono">{check.top.count}</span> of {answers.length} answers agree, so the check
					{check.outcome === 'trusted'
						? `passes “${check.top.text}” on`
						: `flags the answer as a likely guess`}. It needs {AGREE} of {answers.length}.
				{/if}
			</Status>

			<dl class="readouts" aria-live="polite">
				<div>
					<dt>All {rec.questions.length} questions</dt>
					<dd>
						<span class="mono">{all.right}</span> right, <span class="mono">{all.wrong}</span>
						wrong, <span class="mono">{all.declined}</span> declined
					</dd>
				</div>
				<div>
					<dt>The check flags</dt>
					<dd>
						<span class="mono">{all.wrongFlagged}</span> of the {all.wrong} wrong answers,
						<span class="mono">{all.rightFlagged}</span> of the {all.right} right ones
					</dd>
				</div>
			</dl>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.system,
	.truth,
	.greedy {
		margin: 0 0 var(--space-2);
		font-size: 0.9rem;
	}

	.greedy {
		margin-top: var(--space-2);
		overflow-wrap: anywhere;
	}

	.system .label {
		display: block;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	tbody th {
		font-weight: normal;
		overflow-wrap: anywhere;
	}

	td {
		text-align: left;
		white-space: nowrap;
	}

	.count {
		display: inline-block;
		min-width: 2ch;
		text-align: right;
	}

	.bar {
		display: inline-block;
		vertical-align: middle;
		height: 0.6rem;
		width: calc(var(--share) * 5rem);
		margin-left: var(--space-1);
		background: var(--c-prob);
	}

	.mark {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		padding: 0 var(--space-1);
		border-radius: 3px;
	}

	.mark.right {
		background: var(--c-vector-tint);
		color: var(--c-vector-ink);
	}

	.mark.wrong {
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.mark.declined {
		color: var(--ink-muted);
	}

	.readouts {
		display: grid;
		gap: var(--space-1);
		margin: var(--space-3) 0 0;
	}

	.readouts div {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	dt {
		font-weight: 600;
		min-width: 9rem;
	}

	dd {
		margin: 0;
	}
</style>
