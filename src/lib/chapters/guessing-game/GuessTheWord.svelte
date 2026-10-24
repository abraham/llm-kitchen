<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import NextWordFan from '#lib/components/primitives/NextWordFan.svelte';
	import { formatCount, formatPercent } from '#lib/components/primitives/format.ts';

	import { canonical } from '#lib/models/provider.ts';

	const SHOWN = 8;
	const trace = useDataset('traces/the-cat-sat');

	let guess = $state('');
	let checked = $state<string | null>(null);

	function normalize(word: string) {
		return word
			.trim()
			.toLowerCase()
			.replace(/[.,!?;:"]+$/g, '');
	}
</script>

<WidgetFrame
	title="Guess the next word"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => {
		guess = '';
		checked = null;
	}}
>
	<form
		class="guess"
		onsubmit={(event) => {
			event.preventDefault();
			checked = normalize(guess) || null;
		}}
	>
		<label for="guess-input">The cat sat on the …</label>
		<input id="guess-input" bind:value={guess} autocomplete="off" placeholder="your word" />
		<button type="submit">Compare with {canonical.displayName}</button>
	</form>

	<Loading promise={trace}>
		{#snippet children(t)}
			{@const step = t.steps[0]}
			{@const candidates = step.candidates}
			{@const rank = checked
				? candidates.findIndex((c) => normalize(c.token.text) === checked)
				: -1}
			{@const found = rank >= 0 ? candidates[rank] : undefined}
			{@const options = candidates.slice(0, SHOWN).map((c) => ({ label: c.token.text, p: c.prob }))}
			{@const lowest = candidates[candidates.length - 1].prob}

			<p class="result" aria-live="polite">
				{#if checked && found}
					{canonical.displayName} gave <strong>“{checked}”</strong> a {formatPercent(found.prob)} chance:
					its number {rank + 1} guess out of the {candidates.length} we recorded.
				{:else if checked}
					<strong>“{checked}”</strong> isn't in {canonical.displayName}'s top {candidates.length}.
					Each of those got at least {formatPercent(lowest)}, so the model thought your word was
					less likely than all of them.
				{:else}
					Type a word, then see how likely {canonical.displayName} thought it was.
				{/if}
			</p>

			<NextWordFan
				prompt="The cat sat on the"
				options={found && rank >= SHOWN
					? [...options, { label: found.token.text, p: found.prob }]
					: options}
				highlight={found?.token.text}
			/>
			<p class="note">
				The {SHOWN} most likely continuations shown here add up to {formatPercent(
					options.reduce((a, o) => a + o.p, 0)
				)}. The model chooses from {formatCount(canonical.vocabularySize)} possible pieces of text, so
				the other {formatCount(canonical.vocabularySize - SHOWN)} share the rest.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.guess {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	label {
		font-style: italic;
	}

	input {
		font: inherit;
		font-family: var(--font-mono);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
		width: 10rem;
	}

	.result {
		min-height: 3.2em;
	}

	.note {
		font-size: 0.9rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
