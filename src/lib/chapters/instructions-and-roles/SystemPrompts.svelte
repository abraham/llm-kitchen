<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { scrollable } from '#lib/components/layout/scrollable.ts';
	import { chatTemplate } from '#lib/math/chat-template.ts';

	const data = useDataset('prompts/system');
	const id = $props.id();
	let pick = $state(0);
</script>

<WidgetFrame
	title="Same question, different system prompts"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (pick = 0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const r = d.replies[pick]}
			<fieldset>
				<legend class="label">System prompt</legend>
				{#each d.replies as option, i (option.name)}
					<label
						><input type="radio" name="{id}-sys" value={i} bind:group={pick} /> {option.name}</label
					>
				{/each}
			</fieldset>
			<p class="label">What the model reads</p>
			<pre
				class="template">{#each chatTemplate( [{ role: 'system', content: r.system }, { role: 'user', content: d.question }] ) as part, i (i)}<span
						class={part.kind}>{part.text}</span
					>{/each}</pre>
			<p class="label">Its reply ({r.tokens} tokens)</p>
			<div
				class="reply"
				{@attach scrollable}
				role="region"
				aria-label="Reply with the {r.name.toLowerCase()} system prompt"
			>
				{r.text}
			</div>

			<table class="data">
				<caption>
					Does a persona make it better at sums? “{d.persona}” vs. the default system prompt
				</caption>
				<thead>
					<tr>
						<th scope="col">Question</th>
						<th scope="col" class="num">Right answer</th>
						<th scope="col" class="num">Default</th>
						<th scope="col" class="num">Persona</th>
					</tr>
				</thead>
				<tbody>
					{#each d.math as m (m.question)}
						<tr>
							<th scope="row">{m.question.replace(' Reply with only the number.', '')}</th>
							<td>{m.expected}</td>
							{#each [m.default, m.persona] as a, i (i)}
								<td class:wrong={!a.correct}
									>{a.text}
									<span aria-hidden="true">{a.correct ? '✓' : '✗'}</span><span
										class="visually-hidden">{a.correct ? 'right' : 'wrong'}</span
									></td
								>
							{/each}
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<th scope="row">Right</th>
						<td></td>
						<td>{d.math.filter((m) => m.default.correct).length} of {d.math.length}</td>
						<td>{d.math.filter((m) => m.persona.correct).length} of {d.math.length}</td>
					</tr>
				</tfoot>
			</table>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	fieldset {
		border: 0;
		margin: 0 0 var(--space-3);
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

	.template {
		margin: var(--space-1) 0 var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		font-size: 0.8rem;
		white-space: pre-wrap;
	}

	.template .marker {
		color: var(--ink-muted);
	}

	.template .system {
		background: var(--c-harness-tint);
		outline: 1.5px solid var(--c-harness);
		border-radius: 2px;
		font-weight: 700;
	}

	.template .user {
		background: var(--c-token-tint);
		border-radius: 2px;
	}

	.reply {
		margin: var(--space-1) 0 var(--space-4);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		font-size: 0.9rem;
		white-space: pre-wrap;
		max-height: 16rem;
		overflow-y: auto;
	}

	td.wrong {
		color: var(--c-loss-ink);
	}

	tfoot th,
	tfoot td {
		font-weight: 700;
		border-bottom: 0;
	}
</style>
