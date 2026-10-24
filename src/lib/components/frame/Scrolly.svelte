<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import StepController from './StepController.svelte';
	import { Stepper } from './stepper.svelte.ts';

	let {
		steps,
		stepper = new Stepper(steps.length),
		figure
	}: {
		/** Text for each step, in order. */
		steps: string[];
		stepper?: Stepper;
		/** The animated figure; receives the current step index. */
		figure: Snippet<[number]>;
	} = $props();

	const wide = new MediaQuery('min-width: 60rem');
	let stepEls: HTMLElement[] = $state([]);

	// On wide screens, scrolling a step's text to the middle of the viewport selects that step.
	$effect(() => {
		if (!wide.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) stepper.go(stepEls.indexOf(entry.target as HTMLElement));
				}
			},
			{ rootMargin: '-50% 0px -50% 0px' }
		);
		for (const el of stepEls) observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div class="scrolly breakout" class:wide={wide.current}>
	<div class="figure">
		{@render figure(stepper.index)}
		{#if !wide.current}
			<p class="current-step">{steps[stepper.index]}</p>
			<StepController {stepper} describe={(i) => steps[i]} />
		{/if}
	</div>
	{#if wide.current}
		<ol class="steps">
			{#each steps as step, i (i)}
				<li bind:this={stepEls[i]} class:active={i === stepper.index}>
					<button type="button" onclick={() => stepper.go(i)} aria-current={i === stepper.index}>
						{step}
					</button>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.scrolly {
		margin-block: var(--space-8);
	}

	.wide {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--space-8);
	}

	.wide .figure {
		position: sticky;
		top: 15vh;
		align-self: start;
	}

	.current-step {
		margin-block: var(--space-3);
	}

	.steps {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.steps li {
		min-height: 60vh;
		display: flex;
		align-items: center;
	}

	.steps li:last-child {
		min-height: 40vh;
	}

	.steps button {
		all: unset;
		cursor: pointer;
		display: block;
		padding: var(--space-4);
		border-left: 3px solid var(--rule);
		color: var(--ink-muted);
		transition: color var(--duration) var(--ease);
	}

	.steps button:focus-visible {
		outline: 2px solid var(--focus);
	}

	.steps .active button {
		color: var(--ink);
		border-left-color: var(--c-token);
	}
</style>
