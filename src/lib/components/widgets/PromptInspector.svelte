<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import StepController from '#lib/components/layout/StepController.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/layout/stepper.svelte.ts';
	import { segmentPrompt, type AgentRun, type PromptPartKind } from '#lib/harness/agent.ts';
	import { loadJson } from '#lib/models/load-json.ts';

	const data = loadJson<AgentRun>('agent/chat.json');

	const LAYERS: { add: PromptPartKind[]; text: string }[] = [
		{ add: ['message'], text: 'Your message, as you typed it.' },
		{
			add: ['marker'],
			text: 'Chat markers around each turn (Ch 13), so the model knows who said what.'
		},
		{
			add: ['history'],
			text: 'The earlier turns of the conversation. The model has no memory: the harness re-sends everything, every time.'
		},
		{
			add: ['system'],
			text: 'A system prompt written by the app’s makers, with instructions you never see.'
		},
		{
			add: ['tools'],
			text: 'Descriptions of the tools the model may ask for, and the format to ask in (Ch 22).'
		},
		{
			add: ['call', 'result', 'assistant'],
			text: 'The model asked for a tool. The harness ran it and called the model again, with the call and the result added.'
		}
	];
	const stepper = new Stepper(LAYERS.length);
	const visible = $derived(new Set(LAYERS.slice(0, stepper.index + 1).flatMap((l) => l.add)));
	const describe = (i: number) => `Layer ${i + 1} of ${LAYERS.length}: ${LAYERS[i].text}`;

	const LEGEND: { kind: PromptPartKind; label: string }[] = [
		{ kind: 'message', label: 'your message' },
		{ kind: 'marker', label: 'chat markers' },
		{ kind: 'history', label: 'earlier turns' },
		{ kind: 'system', label: 'system prompt' },
		{ kind: 'tools', label: 'tool definitions' },
		{ kind: 'call', label: 'tool call' },
		{ kind: 'result', label: 'tool result' }
	];
</script>

<WidgetFrame
	title="What the model actually sees"
	label="Step through"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => stepper.reset()}
>
	<Loading promise={data}>
		{#snippet children(run)}
			{@const last = run.steps.at(-1)!}
			{@const step = stepper.index === LAYERS.length - 1 ? run.steps[1] : run.steps[0]}
			{@const parts = segmentPrompt(step.prompt)}
			<div class="layout">
				<ol class="chat" aria-label="The chat, as the app shows it">
					{#each run.history as m, i (i)}
						<li class={m.role}>{m.content}</li>
					{/each}
					<li class="user">{run.task}</li>
					<li class="assistant">{last.thought}</li>
				</ol>
				<div class="raw-wrap">
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<pre
						class="raw"
						tabindex="0"
						aria-label="The text sent to the model">{#each parts as p, i (i)}{#if visible.has(p.kind)}<span
									class={p.kind}>{p.text}</span
								>{/if}{/each}</pre>
					<p class="count">
						{#if stepper.index === 0}{run.task.length} characters{:else if stepper.atEnd}The second
							call: {step.promptTokens.toLocaleString('en-US')} tokens{:else}The full first call is {step.promptTokens.toLocaleString(
								'en-US'
							)} tokens{/if}
					</p>
				</div>
			</div>
			<ul class="legend" aria-label="Colors">
				{#each LEGEND as l (l.kind)}
					<li class:off={!visible.has(l.kind)}><span class="swatch {l.kind}"></span>{l.label}</li>
				{/each}
			</ul>
			<p class="explain">{LAYERS[stepper.index].text}</p>
		{/snippet}
	</Loading>

	{#snippet controls()}
		<StepController {stepper} {describe} />
	{/snippet}
</WidgetFrame>

<style>
	.layout {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 52rem) {
		.layout {
			grid-template-columns: 16rem minmax(0, 1fr);
		}
	}

	.chat {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		align-content: start;
		gap: var(--space-2);
		font-size: 0.9rem;
	}

	.chat li {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		white-space: pre-wrap;
	}

	.chat .user {
		justify-self: end;
		background: var(--c-prob-tint);
		max-width: 85%;
	}

	.chat .assistant {
		background: var(--surface-2);
		max-width: 95%;
	}

	.raw {
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.75rem;
		line-height: 1.5;
		padding: var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		margin: 0;
		max-height: 26rem;
		overflow: auto;
	}

	.count {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin: var(--space-1) 0 0;
	}

	.message {
		color: var(--c-prob-ink);
		font-weight: 700;
	}

	.marker {
		color: var(--c-token-ink);
	}

	.history {
		color: var(--ink-muted);
	}

	.system,
	.tools,
	.call {
		color: var(--c-harness-ink);
	}

	.tools {
		font-style: italic;
	}

	.call {
		font-weight: 700;
	}

	.result {
		color: var(--c-attention-ink);
	}

	.assistant {
		color: var(--c-vector-ink);
	}

	.legend {
		list-style: none;
		padding: 0;
		margin: var(--space-3) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.legend li.off .swatch {
		opacity: 0.25;
	}

	.swatch {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
		background: currentColor;
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-3) 0 0;
	}
</style>
