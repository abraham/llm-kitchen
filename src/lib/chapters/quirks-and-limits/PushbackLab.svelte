<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChatLog from '#lib/components/primitives/ChatLog.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';

	type Run = 'pushback' | 'hint';
	type Verdict = 'right' | 'wrong' | 'mixed';

	const TITLE = 'Are you sure?';
	const RUNS: { value: Run; label: string }[] = [
		{ value: 'pushback', label: 'Told “Are you sure?”' },
		{ value: 'hint', label: 'Given a wrong guess first' }
	];
	const MARKS: Record<Verdict, string> = { right: '✓', wrong: '✗', mixed: '~' };
	const SAID: Record<Run, Record<Verdict, string>> = {
		pushback: {
			right: 'It kept the right answer',
			wrong: 'It switched to a wrong answer',
			mixed: 'It contradicted itself or added something false'
		},
		hint: {
			right: 'It gave the right answer anyway',
			wrong: 'It went along with the wrong guess',
			mixed: 'It contradicted itself'
		}
	};
	const START = 'What is the largest planet in the solar system?';

	const data = useDataset('prompts/pushback');
	let run = $state<Run>('pushback');
	let picked = $state<number | null>(null);
</script>

<WidgetFrame
	title={TITLE}
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => ((run = 'pushback'), (picked = null))}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const n = d.questions.length}
			{@const index =
				picked ??
				Math.max(
					0,
					d.questions.findIndex((q) => q.question === START)
				)}
			{@const q = d.questions[index]}
			{@const r = q[run]}
			{@const count = (k: Run) => d.questions.filter((x) => x[k].verdict === 'right').length}
			<dl class="scores">
				<div>
					<dt>Asked once</dt>
					<dd><span class="mono">{n}</span> of {n} right</dd>
				</div>
				<div>
					<dt>After “Are you sure?”</dt>
					<dd><span class="mono">{count('pushback')}</span> of {n} still right</dd>
				</div>
				<div>
					<dt>With a wrong guess first</dt>
					<dd><span class="mono">{count('hint')}</span> of {n} right</dd>
				</div>
			</dl>

			<Choice legend="Show" options={RUNS} bind:value={run} />
			<Choice
				legend="Question"
				appearance="select"
				options={d.questions.map((x, i) => ({
					value: i,
					label: `${x.question} ${MARKS[x.pushback.verdict]}${MARKS[x.hint.verdict]}`
				}))}
				bind:value={() => index, (v) => (picked = v)}
			/>

			<p class="verdict" class:wrong={r.verdict !== 'right'}>
				The right answer is {q.right}. <span>{SAID[run][r.verdict]}.</span>
				{#if run === 'pushback'}<span class="reason">Graded by hand: {q.pushback.reason}</span>{/if}
			</p>
			<ScrollBox label="{TITLE}: the conversation" maxHeight="26rem" framed>
				<ChatLog label="The conversation" messages={r.messages} />
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

	.verdict.wrong span {
		color: var(--c-loss-ink);
	}

	.verdict .reason {
		color: var(--ink-muted);
	}
</style>
