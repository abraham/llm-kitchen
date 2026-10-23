<script lang="ts">
	import StepController from '#lib/components/layout/StepController.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/layout/stepper.svelte.ts';
	import { END, SENNRICH_CORPUS, learnBpe } from '#lib/math/bpe.ts';

	const steps = learnBpe(SENNRICH_CORPUS, 10);
	const stepper = new Stepper(steps.length);
	const step = $derived(steps[stepper.index]);
	const show = (s: string) => s.replace(END, '_');

	function describe(i: number) {
		const s = steps[i];
		return s.merged
			? `Merge ${i}: “${show(s.merged[0])}” + “${show(s.merged[1])}” appeared ${s.pairCount} times, so they become “${show(s.merged.join(''))}”. ${s.totalSymbols} tokens in total.`
			: `Start: every word is split into single letters, plus _ to mark where the word ends. ${s.totalSymbols} tokens in total.`;
	}

	function isMerged(symbol: string) {
		return step.merged !== undefined && symbol === step.merged.join('');
	}
</script>

<WidgetFrame
	title="Byte pair encoding, one merge at a time"
	label="Step through"
	source={{ kind: 'computed' }}
	onreset={() => stepper.reset()}
>
	<div class="layout">
		<div>
			<p class="label">Training text (word × how often it appears)</p>
			<ul class="words">
				{#each step.words as word, w (w)}
					<li>
						<span class="symbols">
							{#each word.symbols as symbol, i (i)}
								<span class="sym" class:merged={isMerged(symbol)}>{show(symbol)}</span>
							{/each}
						</span>
						<span class="count mono">× {word.count}</span>
					</li>
				{/each}
			</ul>
			<p class="total">
				Tokens needed for the whole text: <strong class="mono">{step.totalSymbols}</strong>
				{#if stepper.index > 0}(started at {steps[0].totalSymbols}){/if}
			</p>
		</div>
		<div>
			<p class="label">Vocabulary ({step.vocabulary.length} tokens)</p>
			<ul class="vocab">
				{#each step.vocabulary as symbol (symbol)}
					<li class="sym" class:merged={isMerged(symbol)}>{show(symbol)}</li>
				{/each}
			</ul>
		</div>
	</div>
	<p class="explain">{describe(stepper.index)}</p>

	{#snippet controls()}
		<StepController {stepper} label="Merge steps" {describe} />
	{/snippet}
</WidgetFrame>

<style>
	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-6);
	}

	.words,
	.vocab {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.words li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}

	.symbols {
		display: flex;
		gap: 3px;
	}

	.sym {
		font-family: var(--font-mono);
		padding: 1px 6px;
		border: 1.5px solid var(--c-token);
		border-radius: var(--radius);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
		transition: box-shadow var(--duration) var(--ease);
	}

	.sym.merged {
		box-shadow: 0 0 0 3px var(--c-token);
		font-weight: 700;
	}

	.count {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.vocab {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.total {
		margin-top: var(--space-3);
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-4) 0 0;
	}
</style>
