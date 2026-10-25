<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import type { ThinkingRun } from '#lib/datasets/parsers/prompts.ts';
	import { motion } from '#lib/stores/motion-prefs.svelte.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';

	const data = useDataset('reasoning/thinking');
	let index = $state(0);
	let shown = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;
	const id = $props.id();

	function stop() {
		clearInterval(timer);
		timer = undefined;
	}

	function watch(total: number) {
		stop();
		if (motion.reduced) {
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
			<Choice
				legend="Puzzle"
				appearance="select"
				layout="inline"
				options={d.puzzles.map((x, i) => ({ value: i, label: x.question }))}
				bind:value={() => index, choose}
			/>
			<p class="question">
				{p.question} <span class="expected">(Right answer: {p.expected}.)</span>
			</p>

			<div class="runs">
				<section aria-labelledby="{id}-off">
					<h3 id="{id}-off">Thinking off</h3>
					{@render result(p.off)}
					{@render bubble(p.off.answer, 'Reply with thinking off')}
				</section>
				<section aria-labelledby="{id}-on">
					<h3 id="{id}-on">Thinking on</h3>
					{@render result(p.on)}
					<div class="thinking">
						<p class="label">
							Scratch work: {formatCount(p.on.thinkingTokens)} tokens, hidden from the chat bubble
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
							<ScrollBox label="Scratch work" maxHeight="14rem"
								><pre class="scratch">{p.on.thinking.slice(0, shown)}{shown < p.on.thinking.length
										? '…'
										: ''}</pre></ScrollBox
							>
						{/if}
					</div>
					{#if p.on.answer}
						{@render bubble(p.on.answer, 'Reply with thinking on')}
					{:else}
						<p class="bubble cut">
							No answer: it was still thinking when it hit the limit of {formatCount(limit)} tokens.
						</p>
					{/if}
				</section>
			</div>

			<table>
				<caption>All {d.puzzles.length} puzzles</caption>
				<thead>
					<tr>
						<th scope="col"><span class="visually-hidden">Thinking</span></th>
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
								>{formatCount(
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
	<ScrollBox {label} maxHeight="14rem" framed><div class="reply">{text}</div></ScrollBox>
{/snippet}

{#snippet result(run: ThinkingRun)}
	<p class="verdict" class:right={run.correct}>
		{#if run.final === null}
			<span aria-hidden="true">✗</span> No final answer
		{:else}
			<span aria-hidden="true">{run.correct ? '✓' : '✗'}</span>
			Answered <strong class="mono">{run.final}</strong>{run.correct ? ', right' : ', wrong'}
		{/if}
		<span class="tokens">· {formatCount(run.thinkingTokens + run.answerTokens)} tokens</span>
	</p>
{/snippet}

<style>
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

	h3 {
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
	}

	.reply {
		font-size: 0.85rem;
		white-space: pre-wrap;
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
