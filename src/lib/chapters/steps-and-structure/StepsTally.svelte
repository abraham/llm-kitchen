<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';

	const data = useDataset('prompts/steps');
	let puzzle = $state(0);
	let condition = $state(0);
</script>

<WidgetFrame
	title="Ask for steps, ask for a format"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => {
		puzzle = 0;
		condition = 0;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const p = d.puzzles[puzzle]}
			{@const r = p.runs[condition]}
			<Choice
				legend="Puzzle"
				appearance="select"
				layout="inline"
				options={d.puzzles.map((x, i) => ({ value: i, label: x.question }))}
				bind:value={puzzle}
			/>
			<Choice
				legend="Added to the question"
				options={d.conditions.map((c, i) => ({ value: i, label: c.name }))}
				bind:value={condition}
			/>
			<p class="prompt">
				{p.question}<strong>{d.conditions[condition].suffix}</strong>
				<span class="expected">(Right answer: {p.expected}.)</span>
			</p>
			<p class="verdict" class:right={r.correct}>
				<span aria-hidden="true">{r.correct ? '✓' : '✗'}</span>
				{r.correct ? 'Right' : 'Wrong'} ·
				{r.formatted
					? 'a program can read the answer'
					: 'a person has to read it to find the answer'} ·
				{r.tokens} tokens
			</p>
			<ScrollBox label="The model's reply" maxHeight="16rem" framed
				><div class="reply">
					{r.text}
				</div></ScrollBox
			>

			<table class="data">
				<caption>All {d.puzzles.length} puzzles</caption>
				<thead>
					<tr>
						<th scope="col">Added to the question</th>
						<th scope="col" class="num">Right</th>
						<th scope="col" class="num">Readable by a program</th>
						<th scope="col" class="num">Tokens (average)</th>
					</tr>
				</thead>
				<tbody>
					{#each d.conditions as c, i (c.name)}
						{@const runs = d.puzzles.map((q) => q.runs[i])}
						<tr class:on={i === condition}>
							<th scope="row">{c.name}</th>
							<td>{runs.filter((x) => x.correct).length} of {runs.length}</td>
							<td>{runs.filter((x) => x.formatted).length} of {runs.length}</td>
							<td>{Math.round(runs.reduce((a, x) => a + x.tokens, 0) / runs.length)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="note">
				Answers were graded by reading each reply. “Readable by a program” means the reply was just
				the answer, or ended with the requested “Answer:” line.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.prompt {
		margin: var(--space-2) 0;
	}

	.expected {
		color: var(--ink-muted);
		font-size: 0.9rem;
	}

	.verdict {
		margin: 0 0 var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--c-loss-ink);
	}

	.verdict.right {
		color: var(--c-vector-ink);
	}

	.reply {
		font-size: 0.85rem;
		white-space: pre-wrap;
	}

	table {
		margin-top: var(--space-4);
	}

	caption {
		font-size: inherit;
		font-weight: 600;
		color: inherit;
	}

	tr.on th,
	tr.on td {
		font-weight: 700;
		background: var(--surface-2);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
