<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChatLog from '#lib/components/primitives/ChatLog.svelte';
	import PromptText from '#lib/components/primitives/PromptText.svelte';
	import RoleKey from '#lib/components/primitives/RoleKey.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import { segmentPrompt, type PromptPartKind } from '#lib/harness/agent.ts';
	import { label } from '#lib/curriculum/index.ts';
	import { formatCount } from '#lib/components/primitives/format.ts';

	const data = useDataset('agent/chat');

	const LAYERS: { add: PromptPartKind[]; text: string }[] = [
		{ add: ['message'], text: 'Your message, as you typed it.' },
		{
			add: ['marker'],
			text: `Chat markers around each turn (${label('predictor-to-assistant')}), so the model knows who said what.`
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
			text: `Descriptions of the tools the model may ask for, and the format to ask in (${label('tools')}).`
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
				<ChatLog
					label="The chat, as the app shows it"
					messages={[
						...run.history,
						{ role: 'user', content: run.task },
						{ role: 'assistant', content: last.thought }
					]}
				/>
				<div class="raw-wrap">
					<PromptText
						parts={parts.filter((p) => visible.has(p.kind))}
						label="The text sent to the model"
						maxHeight="26rem"
						emphasis={['message', 'call']}
					/>
					<p class="count">
						{#if stepper.index === 0}{run.task.length} characters{:else if stepper.atEnd}The second
							call: {formatCount(step.promptTokens)} tokens{:else}The full first call is {formatCount(
								step.promptTokens
							)} tokens{/if}
					</p>
				</div>
			</div>
			<RoleKey roles={LEGEND.map((l) => ({ ...l, off: !visible.has(l.kind) }))} />
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

	.count {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin: var(--space-1) 0 0;
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-3) 0 0;
	}
</style>
