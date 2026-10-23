<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import StepController from '#lib/components/layout/StepController.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/layout/stepper.svelte.ts';
	import ToolCallCard from '#lib/components/primitives/ToolCallCard.svelte';
	import type { AgentRun } from '#lib/harness/agent.ts';
	import { calculator } from '#lib/harness/tools.ts';
	import { loadJson } from '#lib/models/load-json.ts';

	const data = Promise.all([
		loadJson<AgentRun>('agent/math-no-tools.json'),
		loadJson<AgentRun>('agent/math-tools.json')
	]);
	let tools = $state(false);
	const stepper = new Stepper(4);
	const id = $props.id();

	const STEPS = [
		'The model writes a tool call: plain text in the format its tool instructions asked for.',
		'The harness spots the call and reads out the tool name and the arguments.',
		'The harness runs the calculator. The model never runs anything itself.',
		'The harness adds the result to the prompt and calls the model again. Now it only has to copy the number.'
	];
	const lastNumber = (text: string) => text.match(/\d[\d,]*\d/g)?.at(-1) ?? '?';
	const n = (s: string) => Number(s.replaceAll(',', '')).toLocaleString('en-US');
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
			<fieldset class="mode">
				<legend class="label">“{off.task}”</legend>
				<label
					><input type="radio" name="{id}-mode" bind:group={tools} value={false} /> Tools off</label
				>
				<label
					><input type="radio" name="{id}-mode" bind:group={tools} value={true} /> Tools on (a calculator)</label
				>
			</fieldset>

			{#if !tools}
				{@const guess = lastNumber(off.steps[0].output)}
				<p class="label">The model’s reply, written token by token</p>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<pre class="reply" tabindex="0">{off.steps[0].output}</pre>
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
	.mode {
		border: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	legend {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		margin-bottom: var(--space-2);
	}

	.reply,
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
