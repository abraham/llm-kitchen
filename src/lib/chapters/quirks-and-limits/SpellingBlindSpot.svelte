<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import { tokenize } from '#lib/models/tokenizers.ts';
	import type { Token } from '#lib/models/provider.ts';

	let word = $state(' strawberry');
	let letter = $state('r');
	let tokens = $state<Token[]>([]);
	const id = $props.id();

	$effect(() => {
		const text = word;
		let current = true;
		tokenize('gpt2', text).then((t) => {
			if (current) tokens = t;
		});
		return () => {
			current = false;
		};
	});

	const count = (s: string) =>
		letter ? [...s.toLowerCase()].filter((c) => c === letter.toLowerCase()).length : 0;
</script>

<WidgetFrame
	title="Letters the model never sees"
	source={{ kind: 'computed' }}
	onreset={() => {
		word = ' strawberry';
		letter = 'r';
	}}
>
	<div class="inputs">
		<label for="{id}-word" class="label">Text (note the leading space)</label>
		<input id="{id}-word" type="text" bind:value={word} />
		<label for="{id}-letter" class="label">Count the letter</label>
		<input id="{id}-letter" type="text" maxlength="1" bind:value={letter} class="letter" />
	</div>

	<div class="rows">
		<p class="label">What you see</p>
		<p class="you">
			{#each [...word] as c, i (i)}<span
					class:hit={letter && c.toLowerCase() === letter.toLowerCase()}>{c === ' ' ? '·' : c}</span
				>{/each}
			<span class="count">“{letter}” appears <strong>{count(word)}</strong> times</span>
		</p>
		<p class="label">
			What {tokens.length === 1
				? 'the model sees: one token'
				: `the model sees: ${tokens.length} tokens`}
		</p>
		<p class="model" aria-live="polite">
			{#each tokens as t, i (i)}<TokenChip token={t} />{/each}
		</p>
		<p class="ids">
			As numbers: <span class="mono">{tokens.map((t) => t.id).join(', ')}</span>
		</p>
	</div>
	<p class="note">
		To count letters, a model has to have learned how each token is spelled, because the letters
		themselves never reach it.
	</p>
</WidgetFrame>

<style>
	.inputs {
		display: grid;
		grid-template-columns: max-content 1fr;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-3);
	}

	input {
		font: inherit;
		font-family: var(--font-mono);
		max-width: 20rem;
	}

	.letter {
		width: 3rem;
	}

	.rows p {
		margin: 0 0 var(--space-2);
	}

	.you {
		font-family: var(--font-mono);
		font-size: 1.2rem;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px;
	}

	.hit {
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		border-radius: 2px;
	}

	.count {
		font-family: var(--font-sans);
		font-size: 0.9rem;
		margin-left: var(--space-3);
	}

	.model {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.ids {
		font-size: 0.9rem;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
