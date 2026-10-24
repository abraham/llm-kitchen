<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { label } from '#lib/curriculum/index.ts';
	import { canonical } from '#lib/models/provider.ts';

	let ending = $state<'big' | 'small'>('big');
	let size = $state(3);
	const id = $props.id();

	const words = $derived(
		`The trophy didn't fit in the suitcase because it was too ${ending}`.split(' ')
	);
	const start = $derived(Math.max(0, words.length - size));
	const sees = (w: string) => words.slice(start).includes(w);

	const presets = [
		{ label: `${label('predicting-by-counting')} bigram (1 word)`, size: 1 },
		{ label: '3 words', size: 3 },
		{ label: 'whole sentence', size: 12 }
	];
	const list = new Intl.ListFormat('en', { type: 'conjunction' });
</script>

<WidgetFrame
	title="How far back can it see?"
	source={{ kind: 'computed' }}
	onreset={() => {
		ending = 'big';
		size = 3;
	}}
>
	<Choice
		legend="The sentence ends with"
		layout="inline"
		options={[
			{ value: 'big', label: 'too big' },
			{ value: 'small', label: 'too small' }
		] as const}
		bind:value={ending}
	/>

	<p class="sentence" aria-label="The sentence, with the last {size} words inside the window">
		{#each words as word, i (i)}
			<span class="word" class:inside={i >= start} class:clue={i === words.length - 1}>{word}</span>
		{/each}
	</p>

	<div class="slider">
		<label for="{id}-size" class="label"
			>Window: the last <span class="mono value" style:min-width="{String(words.length).length}ch"
				>{size}</span
			> words</label
		>
		<input id="{id}-size" type="range" min="1" max={words.length} bind:value={size} />
		<span class="presets">
			{#each presets as p (p.label)}
				<button type="button" onclick={() => (size = p.size)}>{p.label}</button>
			{/each}
		</span>
	</div>

	<ul class="checks" aria-live="polite">
		{#each ['trophy', 'suitcase', 'it', ending] as w (w)}
			<li class:yes={sees(w)}>
				<span class="mark" aria-hidden="true">{sees(w) ? '✓' : '✗'}</span>
				{sees(w) ? 'Sees' : 'Misses'} “{w}”
			</li>
		{/each}
	</ul>
	<p class="verdict">
		{#if sees('trophy') && sees('suitcase') && sees('it')}
			The window holds everything needed: “it” is the {ending === 'big' ? 'trophy' : 'suitcase'}.
		{:else}
			Not enough to tell what “it” is. The deciding word is “{ending}”, but the window is missing
			{list.format(['trophy', 'suitcase', 'it'].filter((w) => !sees(w)).map((w) => `“${w}”`))}.
		{/if}
	</p>
	<p class="note">
		For scale: {canonical.displayName} can look back up to {canonical.contextLength.toLocaleString(
			'en-US'
		)} tokens.
	</p>
</WidgetFrame>

<style>
	.sentence {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: 1.15rem;
	}

	.word {
		padding: 2px var(--space-1);
		border-radius: 3px;
		color: var(--ink-muted);
		border: 1.5px solid transparent;
		transition: background var(--duration) var(--ease);
	}

	.word.inside {
		color: var(--ink);
		background: var(--c-token-tint);
		border-color: var(--c-token);
	}

	.word.clue {
		font-weight: 700;
	}

	.slider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}

	input[type='range'] {
		min-width: 12rem;
	}

	/* Room for the widest number, so the slider after the label stays put. */
	.value {
		display: inline-block;
		text-align: end;
		letter-spacing: normal;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.checks {
		list-style: none;
		padding: 0;
		margin: var(--space-4) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	.checks li {
		color: var(--c-loss-ink);
	}

	.checks li.yes {
		color: var(--c-vector-ink);
	}

	.verdict {
		margin: var(--space-3) 0 0;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
