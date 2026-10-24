<script lang="ts">
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import SamplerWheel from '#lib/components/primitives/SamplerWheel.svelte';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import type { GenerationStep } from '#lib/models/provider.ts';
	import type { Trace } from '#lib/models/trace.ts';

	let {
		trace,
		title = 'One token at a time',
		shown = 8,
		maxSteps = Infinity
	}: {
		trace: Trace;
		title?: string;
		/** How many top candidates to draw (the chosen one is always included). */
		shown?: number;
		maxSteps?: number;
	} = $props();

	// Each generated token takes three steps: score the candidates, spin, append.
	const PHASES = ['score', 'spin', 'append'] as const;
	const steps = $derived(trace.steps.slice(0, maxSteps));
	const stepper = $derived(new Stepper(steps.length * PHASES.length));

	function visible(step: GenerationStep) {
		const top = step.candidates.slice(0, shown);
		const chosen = step.candidates.find((c) => c.token.id === step.chosen.id);
		return top.some((c) => c.token.id === step.chosen.id) || !chosen ? top : [...top, chosen];
	}

	const genStep = $derived(Math.floor(stepper.index / PHASES.length));
	const phase = $derived(PHASES[stepper.index % PHASES.length]);
	const current = $derived(steps[genStep]);
	const candidates = $derived(visible(current));
	const chosenIndex = $derived(candidates.findIndex((c) => c.token.id === current.chosen.id));
	const context = $derived(
		phase === 'append' ? [...current.context, current.chosen] : current.context
	);

	function describe(index: number): string {
		const s = steps[Math.floor(index / PHASES.length)];
		const chosen = `“${displayToken(s.chosen.text)}”`;
		switch (PHASES[index % PHASES.length]) {
			case 'score':
				return `The model gives every possible next piece of text a probability. The top ${visible(s).length} are shown.`;
			case 'spin':
				return `A spinner with slices sized by probability picks one: ${chosen}.`;
			case 'append':
				return `${chosen} is added to the text, and the whole process repeats.`;
		}
	}
</script>

<WidgetFrame
	{title}
	label="Step through"
	source={trace.kind === 'sample'
		? { kind: 'sample' }
		: { kind: 'recorded', model: trace.modelDisplayName }}
	onreset={() => stepper.reset()}
>
	<div class="context" aria-label="Text so far">
		{#each context as token, i (i)}
			<TokenChip
				{token}
				state={phase === 'append' && i === context.length - 1 ? 'new' : 'default'}
			/>
		{/each}
	</div>

	<div class="stage">
		<div class="bars">
			<ProbBars
				caption="Probabilities for what comes next"
				bars={candidates.map((c) => ({
					label: c.token.text,
					p: c.prob,
					highlight: phase !== 'score' && c.token.id === current.chosen.id
				}))}
			/>
		</div>
		<div class="wheel">
			<SamplerWheel
				slices={candidates.map((c) => ({ label: c.token.text, p: c.prob }))}
				landOn={phase === 'score' ? null : chosenIndex}
				spin={genStep}
			/>
		</div>
	</div>

	<p class="explain">{describe(stepper.index)}</p>

	{#snippet controls()}
		<StepController {stepper} {describe} />
	{/snippet}
</WidgetFrame>

<style>
	.context {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: var(--space-4);
	}

	.stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		align-items: center;
	}

	@media (min-width: 48rem) {
		.stage {
			grid-template-columns: minmax(0, 1fr) auto;
		}
	}

	.explain {
		margin: var(--space-4) 0 0;
		min-height: 3.2em;
	}
</style>
