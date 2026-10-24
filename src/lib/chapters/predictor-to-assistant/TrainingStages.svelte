<script lang="ts">
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';

	const STAGES = [
		{
			name: 'Pretraining',
			data: 'Huge amounts of text from the web, books, and code',
			goal: 'Predict the next token',
			example: {
				input: 'How do I boil an egg?',
				output: 'What is the best way to boil an egg? Do those questions have the same meaning?'
			},
			result:
				'A model that continues any text in the style of whatever it resembles. A question might be followed by an answer, or by more questions.'
		},
		{
			name: 'Instruction tuning',
			data: 'Thousands of example conversations written by people',
			goal: 'Predict the next token of good answers',
			example: {
				input: '<user> How do I boil an egg? <assistant>',
				output: 'Put the egg in boiling water for about 8 minutes, then cool it in cold water.'
			},
			result:
				'The same training method, on a different kind of text. The model learns the chat format and the habit of answering.'
		},
		{
			name: 'Preference tuning',
			data: 'People compare two answers and pick the better one',
			goal: 'Make preferred answers more likely',
			example: {
				input: 'Answer A 👍 · Answer B 👎',
				output: 'Nudge the weights toward answers like A'
			},
			result:
				'A scoring model learns what people prefer, and the chat model is nudged to score well. This shapes tone, helpfulness, and refusals.'
		}
	];
	const stepper = new Stepper(STAGES.length);
	const describe = (i: number) => `Stage ${i + 1}: ${STAGES[i].name}. ${STAGES[i].result}`;
</script>

<WidgetFrame
	title="From predictor to assistant"
	label="Step through"
	source={{ kind: 'sample' }}
	onreset={() => stepper.reset()}
>
	<ol class="stages">
		{#each STAGES as s, i (s.name)}
			<li
				class:current={i === stepper.index}
				class:done={i < stepper.index}
				aria-current={i === stepper.index ? 'step' : undefined}
			>
				<span class="n">{i + 1}</span>
				{s.name}
			</li>
		{/each}
	</ol>
	{#each [STAGES[stepper.index]] as s (s.name)}
		<dl class="card">
			<dt>Trained on</dt>
			<dd>{s.data}</dd>
			<dt>Goal</dt>
			<dd>{s.goal}</dd>
			<dt>Example</dt>
			<dd class="example">
				<span class="mono in">{s.example.input}</span>
				<span class="arrow" aria-hidden="true">→</span>
				<span class="mono">{s.example.output}</span>
			</dd>
		</dl>
	{/each}
	<p class="explain">{STAGES[stepper.index].result}</p>

	{#snippet controls()}
		<StepController {stepper} {describe} />
	{/snippet}
</WidgetFrame>

<style>
	.stages {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-4);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	.stages li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border: 1.5px solid var(--rule);
		border-radius: 999px;
		color: var(--ink-muted);
	}

	.stages li.done {
		border-color: var(--c-weight);
		color: var(--ink);
	}

	.stages li.current {
		border-color: var(--c-weight);
		background: var(--c-weight-tint);
		color: var(--c-weight-ink);
		font-weight: 600;
	}

	.n {
		font-family: var(--font-mono);
	}

	.card {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-1) var(--space-3);
		margin: 0;
	}

	dt {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	dd {
		margin: 0;
	}

	.example {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: 0.85rem;
	}

	.in {
		color: var(--ink-muted);
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-4) 0 0;
	}
</style>
