<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';

	const data = useDataset('prompts/steps');
	const id = $props.id();
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
			<div class="pick">
				<label for="{id}-q" class="label">Puzzle</label>
				<select id="{id}-q" bind:value={puzzle}>
					{#each d.puzzles as option, i (option.question)}<option value={i}
							>{option.question}</option
						>{/each}
				</select>
			</div>
			<fieldset>
				<legend class="label">Added to the question</legend>
				{#each d.conditions as c, i (c.name)}
					<label
						><input type="radio" name="{id}-c" value={i} bind:group={condition} /> {c.name}</label
					>
				{/each}
			</fieldset>
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
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="reply" tabindex="0" role="region" aria-label="The model's reply">{r.text}</div>

			<table>
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
	.pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	select {
		font: inherit;
		max-width: 100%;
	}

	fieldset {
		border: 0;
		margin: 0 0 var(--space-2);
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		width: 100%;
		padding: 0;
	}

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
		margin: 0 0 var(--space-4);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		font-size: 0.85rem;
		white-space: pre-wrap;
		max-height: 16rem;
		overflow-y: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	caption {
		text-align: left;
		font-family: var(--font-sans);
		font-weight: 600;
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

	tbody th {
		font-weight: 400;
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
