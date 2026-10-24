<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import type { ThinkingRun } from '#lib/datasets/parsers/prompts.ts';
	import { prefersReducedMotion } from 'svelte/motion';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { scrollable } from '#lib/components/ui/scrollable.ts';

	const data = useDataset('reasoning/thinking');
	let index = $state(0);
	let shown = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;
	const id = $props.id();
	const fmt = (n: number) => n.toLocaleString('en-US');

	function stop() {
		clearInterval(timer);
		timer = undefined;
	}

	function watch(total: number) {
		stop();
		if (prefersReducedMotion.current) {
			shown = total;
			return;
		}
		shown = 0;
		timer = setInterval(() => {
			shown = Math.min(total, shown + 40);
			if (shown >= total) stop();
		}, 30);
	}

	function choose(i: number) {
		stop();
		index = i;
		shown = 0;
	}

	$effect(() => stop);
</script>

<WidgetFrame
	title="Thinking off, thinking on"
	source={{ kind: 'recorded', model: 'Qwen3-0.6B' }}
	onreset={() => choose(0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const p = d.puzzles[index]}
			{@const limit = d.settings.on.max_new_tokens}
			<div class="pick">
				<label for="{id}-q" class="label">Puzzle</label>
				<select id="{id}-q" value={index} onchange={(e) => choose(+e.currentTarget.value)}>
					{#each d.puzzles as option, i (option.question)}<option value={i}
							>{option.question}</option
						>{/each}
				</select>
			</div>
			<p class="question">
				{p.question} <span class="expected">(Right answer: {p.expected}.)</span>
			</p>

			<div class="runs">
				<section aria-labelledby="{id}-off">
					<h4 id="{id}-off">Thinking off</h4>
					{@render result(p.off)}
					{@render bubble(p.off.answer, 'Reply with thinking off')}
				</section>
				<section aria-labelledby="{id}-on">
					<h4 id="{id}-on">Thinking on</h4>
					{@render result(p.on)}
					<div class="thinking">
						<p class="label">
							Scratch work: {fmt(p.on.thinkingTokens)} tokens, hidden from the chat bubble
						</p>
						<div class="buttons">
							<button type="button" onclick={() => watch(p.on.thinking.length)}
								>Watch it think</button
							>
							<button type="button" onclick={() => (stop(), (shown = p.on.thinking.length))}
								>Show it all</button
							>
						</div>
						{#if shown > 0}
							<pre
								class="scratch"
								{@attach scrollable}
								role="region"
								aria-label="Scratch work">{p.on.thinking.slice(0, shown)}{shown <
								p.on.thinking.length
									? '…'
									: ''}</pre>
						{/if}
					</div>
					{#if p.on.answer}
						{@render bubble(p.on.answer, 'Reply with thinking on')}
					{:else}
						<p class="bubble cut">
							No answer: it was still thinking when it hit the limit of {fmt(limit)} tokens.
						</p>
					{/if}
				</section>
			</div>

			<table>
				<caption>All {d.puzzles.length} puzzles</caption>
				<thead>
					<tr>
						<th scope="col"></th>
						<th scope="col" class="num">Right answers</th>
						<th scope="col" class="num">Tokens written (average)</th>
					</tr>
				</thead>
				<tbody>
					{#each [['Thinking off', 'off'], ['Thinking on', 'on']] as const as [name, key] (key)}
						{@const runs = d.puzzles.map((q) => q[key])}
						<tr>
							<th scope="row">{name}</th>
							<td>{runs.filter((r) => r.correct).length} of {runs.length}</td>
							<td
								>{fmt(
									Math.round(
										runs.reduce((a, r) => a + r.thinkingTokens + r.answerTokens, 0) / runs.length
									)
								)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{/snippet}
	</Loading>
</WidgetFrame>

{#snippet bubble(text: string, label: string)}
	<div class="bubble" {@attach scrollable} role="region" aria-label={label}>{text}</div>
{/snippet}

{#snippet result(run: ThinkingRun)}
	<p class="verdict" class:right={run.correct}>
		{#if run.final === null}
			<span aria-hidden="true">✗</span> No final answer
		{:else}
			<span aria-hidden="true">{run.correct ? '✓' : '✗'}</span>
			Answered <strong class="mono">{run.final}</strong>{run.correct ? ', right' : ', wrong'}
		{/if}
		<span class="tokens">· {fmt(run.thinkingTokens + run.answerTokens)} tokens</span>
	</p>
{/snippet}

<style>
	.pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.question {
		font-size: 1.05rem;
		margin: var(--space-3) 0;
	}

	.expected {
		color: var(--ink-muted);
		font-size: 0.9rem;
	}

	.runs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-4);
		align-items: start;
	}

	h4 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	.verdict {
		margin: var(--space-1) 0 var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--c-loss-ink);
	}

	.verdict.right {
		color: var(--c-vector-ink);
	}

	.tokens {
		color: var(--ink-muted);
	}

	.bubble {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		font-size: 0.85rem;
		white-space: pre-wrap;
		max-height: 14rem;
		overflow-y: auto;
	}

	.bubble.cut {
		color: var(--ink-muted);
		font-style: italic;
	}

	.thinking {
		margin-bottom: var(--space-2);
		border-left: 3px dashed var(--c-harness);
		padding-left: var(--space-2);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: var(--space-1) 0;
	}

	.scratch {
		margin: var(--space-1) 0 0;
		font-size: 0.75rem;
		white-space: pre-wrap;
		max-height: 14rem;
		overflow-y: auto;
		color: var(--ink-muted);
	}

	table {
		margin-top: var(--space-4);
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	caption {
		text-align: left;
		font-family: var(--font-sans);
		font-weight: 600;
		margin-bottom: var(--space-1);
	}

	th,
	td {
		padding: 2px var(--space-3) 2px 0;
		border-bottom: 1px solid var(--rule);
		text-align: left;
	}

	th.num,
	td {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--ink-muted);
	}
</style>
