<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import PromptText from '#lib/components/primitives/PromptText.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { chatTemplate } from '#lib/math/chat-template.ts';

	const data = useDataset('prompts/system');
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
			<Choice
				legend="System prompt"
				options={d.replies.map((r, i) => ({ value: i, label: r.name }))}
				bind:value={pick}
			/>
			<p class="label">What the model reads</p>
			<div class="template">
				<PromptText
					parts={chatTemplate([
						{ role: 'system', content: r.system },
						{ role: 'user', content: d.question }
					])}
					label="What the model reads"
					maxHeight="none"
					emphasis={['system']}
				/>
			</div>
			<p class="label">Its reply ({r.tokens} tokens)</p>
			<ScrollBox
				label="Reply with the {r.name.toLowerCase()} system prompt"
				maxHeight="16rem"
				framed
				><div class="reply">
					{r.text}
				</div></ScrollBox
			>

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
	.template {
		margin: var(--space-1) 0 var(--space-3);
	}

	.reply {
		font-size: 0.9rem;
		white-space: pre-wrap;
	}

	table {
		margin-top: var(--space-4);
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
