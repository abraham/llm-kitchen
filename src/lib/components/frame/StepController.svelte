<script lang="ts">
	import type { Stepper } from './stepper.svelte.ts';

	let {
		stepper,
		label = 'Steps',
		describe
	}: {
		stepper: Stepper;
		label?: string;
		/** Short text for the current step, read out to screen readers when it changes. */
		describe?: (index: number) => string;
	} = $props();

	function onkeydown(event: KeyboardEvent) {
		if (stepper.handleKey(event.key)) event.preventDefault();
	}
</script>

<!-- aria-disabled (not disabled) keeps focus on the button at either end, so arrow keys keep working. -->
<div class="step-controller" role="group" aria-label={label}>
	<button type="button" onclick={() => stepper.prev()} {onkeydown} aria-disabled={stepper.atStart}>
		← Prev
	</button>
	<span class="position">
		Step <span class="mono">{stepper.index + 1}</span> of
		<span class="mono">{stepper.count}</span>
	</span>
	<button type="button" onclick={() => stepper.next()} {onkeydown} aria-disabled={stepper.atEnd}>
		Next →
	</button>
	<span class="hint label">or use ← → keys</span>
	<p class="visually-hidden" aria-live="polite">
		{describe ? describe(stepper.index) : `Step ${stepper.index + 1} of ${stepper.count}`}
	</p>
</div>

<style>
	.step-controller {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.position {
		min-width: 7em;
		text-align: center;
	}

	.hint {
		margin-left: auto;
	}

	@media (hover: none) {
		.hint {
			display: none;
		}
	}
</style>
