<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import type { BaseVsInstruct, Column } from '#lib/datasets/parsers/prompts.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';

	const data = useDataset('chat/base-vs-instruct');
	let index = $state(0);

	const columns = (d: BaseVsInstruct): { key: Column; title: string; detail: string }[] => [
		{ key: 'gpt2', title: d.models.gpt2.displayName, detail: 'base model, 2019' },
		{ key: 'base', title: d.models.base.displayName, detail: 'base model' },
		{
			key: 'instructNoTemplate',
			title: d.models.instruct.displayName,
			detail: 'tuned, but given the bare text'
		},
		{ key: 'instruct', title: d.models.instruct.displayName, detail: 'tuned, in its chat format' }
	];
</script>

<WidgetFrame
	title="Same words, different models"
	source={{ kind: 'recorded', model: 'GPT-2 small and Qwen2.5-0.5B' }}
	onreset={() => (index = 0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			<Choice
				legend="Prompt"
				appearance="select"
				layout="inline"
				options={d.prompts.map((p, i) => ({ value: i, label: p.prompt }))}
				bind:value={index}
			/>
			<div class="grid">
				{#each columns(d) as c (c.key)}
					{@const out = d.prompts[index][c.key]}
					<section class="col" class:chat={c.key === 'instruct'} aria-label="{c.title}, {c.detail}">
						<h4>{c.title}<span>{c.detail}</span></h4>
						<p class="out">
							{#if c.key !== 'instruct'}<span class="prompt">{d.prompts[index].prompt}</span
								>{/if}{out.text}
						</p>
						<p class="end">
							{out.stopped ? 'Stopped by itself.' : `Cut off at ${d.maxNewTokens} tokens.`}
						</p>
					</section>
				{/each}
			</div>
			<p class="note">
				Each model picks its most likely token every time, so these are repeatable. Shaded text is
				the prompt; the rest is what the model wrote.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: var(--space-3);
	}

	.col {
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
	}

	.col.chat {
		border-color: var(--c-vector);
	}

	h4 {
		margin: 0 0 var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	h4 span {
		display: block;
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--ink-muted);
	}

	.out {
		white-space: pre-wrap;
		font-size: 0.9rem;
		margin: 0;
	}

	.prompt {
		color: var(--ink-muted);
		background: color-mix(in oklch, var(--rule) 60%, transparent);
		border-radius: 3px;
		padding: 0 2px;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
	}

	.end {
		font-size: 0.75rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
