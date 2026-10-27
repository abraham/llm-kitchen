<script lang="ts">
	import { untrack } from 'svelte';
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChatLog from '#lib/components/primitives/ChatLog.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import type { ProblemRun } from '#lib/datasets/parsers/prompts.ts';

	let { title, runs, start }: { title: string; runs: readonly ProblemRun[]; start: string } =
		$props();

	const NAMES: Record<ProblemRun, string> = {
		plain: 'All in one message',
		distracted: 'With an extra sentence',
		ignore: 'Extra sentence, told to ignore it',
		turns: 'Question first, details later'
	};
	const data = useDataset('prompts/problems');
	const first = untrack(() => runs[1]);
	let run = $state<ProblemRun>(first);
	let picked = $state<number | null>(null);

	type Role = 'system' | 'user' | 'assistant';
</script>

<WidgetFrame
	{title}
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => ((run = first), (picked = null))}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const n = d.problems.length}
			{@const shown = d.problems.findIndex((p) => p.facts[0].startsWith(start))}
			{@const index = picked ?? Math.max(0, shown)}
			{@const p = d.problems[index]}
			{@const r = p.runs[run]}
			<dl class="scores" aria-live="polite">
				{#each runs as k (k)}
					<div>
						<dt>{NAMES[k]}</dt>
						<dd>
							<span class="mono">{d.problems.filter((x) => x.runs[k].correct).length}</span> of {n}
							right
						</dd>
					</div>
				{/each}
			</dl>

			<Choice
				legend="Show"
				options={runs.map((k) => ({ value: k, label: NAMES[k] }))}
				bind:value={run}
			/>
			<Choice
				legend="Problem"
				appearance="select"
				options={d.problems.map((x, i) => ({
					value: i,
					label: `${x.question} ${runs.map((k) => (x.runs[k].correct ? '✓' : '✗')).join('')}`
				}))}
				bind:value={() => index, (v) => (picked = v)}
			/>

			<p class="verdict" class:wrong={!r.correct}>
				The right answer is <span class="mono">{formatCount(p.answer)}</span>; the model answered
				<span class="mono">{r.answer ?? 'nothing'}</span>.
			</p>
			<ScrollBox label="{title}: the conversation" maxHeight="26rem" framed>
				<ChatLog
					label="The conversation"
					messages={r.messages.map((m) => ({ role: m.role as Role, content: m.content }))}
				/>
			</ScrollBox>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.scores {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
	}

	.scores div {
		padding: var(--space-2);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	dt {
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	dd {
		margin: 0;
		font-weight: 600;
	}

	.verdict {
		font-size: 0.9rem;
	}

	.verdict.wrong .mono:last-child {
		color: var(--c-loss-ink);
	}
</style>
