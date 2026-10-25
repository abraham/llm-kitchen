<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import NextWordFan from '#lib/components/primitives/NextWordFan.svelte';
	import { formatCount, formatPercent } from '#lib/components/primitives/format.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';
	import { canonical, type Candidate } from '#lib/models/provider.ts';

	const SHOWN = 8;
	const TOP_K = 50;
	const PROMPT = 'The cat sat on the';
	const trace = useDataset('traces/the-cat-sat');
	const option = useProvider('next-token', canonical.displayName);

	let guess = $state('');
	let checked = $state<string | null>(null);
	/** The beginning the model continues; the visitor's own only while live. */
	let beginning = $state(PROMPT);
	let draft = $state(PROMPT);
	let live = $state<{ prompt: string; candidates: Candidate[] } | null>(null);
	let problem = $state('');
	let request = 0;
	const id = $props.id();
	const prompt = $derived(option.live ? beginning : PROMPT);

	function normalize(word: string) {
		return word
			.trim()
			.toLowerCase()
			.replace(/[.,!?;:"]+$/g, '');
	}

	$effect(() => {
		const provider = option.provider;
		const text = beginning;
		if (!provider) return;
		const mine = ++request;
		problem = '';
		provider.nextTokenDistribution(text, { topK: TOP_K }).then(
			(d) => {
				if (mine === request) live = { prompt: text, candidates: d.candidates };
			},
			(error) => {
				if (mine === request) problem = error instanceof Error ? error.message : String(error);
			}
		);
	});
</script>

<WidgetFrame
	title="Guess the next word"
	source={option.source}
	live={option}
	onreset={() => {
		guess = '';
		checked = null;
		beginning = draft = PROMPT;
	}}
>
	{#if option.live}
		<form
			class="guess"
			onsubmit={(event) => {
				event.preventDefault();
				if (draft.trim()) beginning = draft.trimEnd();
				checked = null;
			}}
		>
			<label for="{id}-beginning">Start of a sentence</label>
			<input
				id="{id}-beginning"
				class="wide"
				bind:value={draft}
				autocomplete="off"
				placeholder="Type a beginning…"
			/>
			<button type="submit">Use it</button>
		</form>
	{/if}
	<form
		class="guess"
		onsubmit={(event) => {
			event.preventDefault();
			checked = normalize(guess) || null;
		}}
	>
		<label for="{id}-guess">{prompt} …</label>
		<input id="{id}-guess" bind:value={guess} autocomplete="off" placeholder="your word" />
		<button type="submit">Compare with {canonical.displayName}</button>
	</form>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	<Loading promise={trace}>
		{#snippet children(t)}
			{@const recorded = t.steps[0].candidates}
			{@const fresh = !option.live || live?.prompt === prompt}
			{@const candidates = option.live ? (live?.candidates ?? []) : recorded}
			{@const rank = checked
				? candidates.findIndex((c) => normalize(c.token.text) === checked)
				: -1}
			{@const found = rank >= 0 ? candidates[rank] : undefined}
			{@const options = candidates.slice(0, SHOWN).map((c) => ({ label: c.token.text, p: c.prob }))}
			{@const lowest = candidates.at(-1)?.prob ?? 0}

			<p class="result" aria-live="polite">
				{#if checked && found}
					{canonical.displayName} gave <strong>“{checked}”</strong> a {formatPercent(found.prob)} chance:
					its number {rank + 1} guess out of the {candidates.length}
					{option.live ? 'it gave' : 'we recorded'}.
				{:else if checked && candidates.length}
					<strong>“{checked}”</strong> isn't in {canonical.displayName}'s top {candidates.length}.
					Each of those got at least {formatPercent(lowest)}, so the model thought your word was
					less likely than all of them.
				{:else}
					Type a word, then see how likely {canonical.displayName} thought it was.
				{/if}
			</p>

			<div class:busy={!fresh}>
				<NextWordFan
					{prompt}
					options={found && rank >= SHOWN
						? [...options, { label: found.token.text, p: found.prob }]
						: options}
					highlight={found?.token.text}
				/>
			</div>
			<p class="note">
				The {SHOWN} most likely continuations shown here add up to {formatPercent(
					options.reduce((a, o) => a + o.p, 0)
				)}. The model chooses from {formatCount(canonical.vocabularySize)} possible pieces of text, so
				the other {formatCount(canonical.vocabularySize - SHOWN)} share the rest.
			</p>
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Type the start of your own sentence, and {canonical.displayName} guesses the next word live."
	/>
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

	input.wide {
		width: auto;
		min-width: 14rem;
		flex: 1;
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.result {
		min-height: 3.2em;
	}

	.busy {
		opacity: 0.5;
		transition: opacity var(--duration) var(--ease);
	}

	.note {
		font-size: 0.9rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
