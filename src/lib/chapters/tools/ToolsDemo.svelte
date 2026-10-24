<script lang="ts">
	import { all, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ToolCallCard from '#lib/components/primitives/ToolCallCard.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';

	import { calculator } from '#lib/harness/tools.ts';

	const data = all([useDataset('agent/math-no-tools'), useDataset('agent/math-tools')]);
	let tools = $state(false);
	const stepper = new Stepper(4);

	const STEPS = [
		'The model writes a tool call: plain text in the format its tool instructions asked for.',
		'The harness spots the call and reads out the tool name and the arguments.',
		'The harness runs the calculator. The model never runs anything itself.',
		'The harness adds the result to the prompt and calls the model again. Now it only has to copy the number.'
	];
	const lastNumber = (text: string) => text.match(/\d[\d,]*\d/g)?.at(-1) ?? '?';
	const n = (s: string) => formatCount(Number(s.replaceAll(',', '')));
</script>

<WidgetFrame
	title="Tools off, tools on"
	label="Step through"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => {
		tools = false;
		stepper.reset();
	}}
>
	<Loading promise={data}>
		{#snippet children([off, on])}
			{@const correct = calculator('1234 * 5678')}
			<p class="task">“{off.task}”</p>
			<Choice
				legend="Tools"
				hideLabel
				options={[
					{ value: false, label: 'Tools off' },
					{ value: true, label: 'Tools on (a calculator)' }
				]}
				bind:value={tools}
			/>

			{#if !tools}
				{@const guess = lastNumber(off.steps[0].output)}
				<p class="label">The model’s reply, written token by token</p>
				<ScrollBox label="The model's reply" maxHeight="16rem" framed
					><pre class="reply">{off.steps[0].output}</pre></ScrollBox
				>
				<p class="verdict" aria-live="polite">
					Its answer: <strong class="mono wrong">{n(guess)}</strong>. The right answer is
					<strong class="mono">{n(correct)}</strong>. Every digit was predicted like any other
					token.
				</p>
			{:else}
				{@const call = on.steps[0]}
				<div class="flow">
					<div class="box model">
						<p class="who">Model writes</p>
						<pre class="raw">{call.output}</pre>
					</div>
					{#if stepper.index >= 1}
						<div class="box">
							<p class="who">Harness reads{stepper.index >= 2 ? ' and runs' : ''}</p>
							<ToolCallCard
								call={call.call!}
								result={stepper.index >= 2
									? calculator(call.call!.arguments.expression)
									: undefined}
							/>
						</div>
					{/if}
					{#if stepper.index >= 3}
						<div class="box model">
							<p class="who">Model writes</p>
							<p class="answer">{on.steps[1].thought}</p>
						</div>
					{/if}
				</div>
				<p class="explain">{STEPS[stepper.index]}</p>
			{/if}
		{/snippet}
	</Loading>

	{#snippet controls()}
		{#if tools}<StepController {stepper} describe={(i) => STEPS[i]} />{/if}
	{/snippet}
</WidgetFrame>

<style>
	.task {
		font-size: 1.05rem;
		margin: 0 0 var(--space-2);
	}

	.reply {
		margin: 0;
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.raw {
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.75rem;
		background: var(--surface-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		margin: 0;
		max-height: 16rem;
		overflow: auto;
	}

	.verdict {
		margin: var(--space-3) 0 0;
	}

	.wrong {
		color: var(--c-loss-ink);
	}

	.flow {
		display: grid;
		gap: var(--space-3);
	}

	.who {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink-muted);
		margin: 0 0 var(--space-1);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.answer {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		background: var(--c-vector-tint);
		border-radius: var(--radius);
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-3) 0 0;
	}
</style>
