<script lang="ts">
	import { then, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import { writtenAfter, type SpeculativeRecording } from '#lib/math/speculative.ts';

	const data = useDataset('speculative/drafts');
	let choice = $state(0);
	let stepper = $state(new Stepper(1));

	then(data, (d) => (stepper = new Stepper(d.runs[0].rounds.length)));

	const plural = (n: number, word: string) =>
		`${n} ${n === 1 ? word : word.endsWith('s') ? `${word}es` : `${word}s`}`;

	function pick(d: SpeculativeRecording, i: number) {
		choice = i;
		stepper = new Stepper(d.runs[i].rounds.length);
	}
</script>

<WidgetFrame
	title="A small model guesses, a big one checks"
	label="Step through"
	source={{ kind: 'recorded', model: 'GPT-2 small and GPT-2 medium' }}
	onreset={() => stepper.reset()}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const run = d.runs[choice]}
			{@const round = run.rounds[stepper.index]}
			{@const before = writtenAfter(run, stepper.index)}
			{@const after = writtenAfter(run, stepper.index + 1)}
			<Choice
				legend="Prompt"
				appearance="select"
				layout="inline"
				options={d.runs.map((r, i) => ({ value: i, label: r.prompt }))}
				bind:value={() => choice, (i) => pick(d, i)}
			/>

			<p class="text">
				<span class="prompt-text">{run.prompt}</span>{run.written
					.slice(0, before)
					.map((t) => t.text)
					.join('')}<strong
					>{run.written
						.slice(before, after)
						.map((t) => t.text)
						.join('')}</strong
				>
			</p>

			<div class="round">
				<p class="label">
					Pass {stepper.index + 1}: {d.drafter.displayName} guesses {d.draft} tokens, {d.target
						.displayName} checks them all at once
				</p>
				<ol class="chips" aria-label="The guesses and the big model's verdict">
					{#each round.guesses as g, i (i)}
						<li class:kept={i < round.kept} class:rejected={i >= round.kept}>
							<TokenChip token={g} showId={false} />
							<span class="verdict"
								>{i < round.kept ? 'kept' : i === round.kept ? 'wrong' : 'dropped'}</span
							>
						</li>
					{/each}
					<li class="added">
						<TokenChip token={round.added} showId={false} state="new" />
						<span class="verdict">{d.target.displayName}'s own</span>
					</li>
				</ol>
				<p class="explain">
					{#if round.kept === d.draft}
						All {d.draft} guesses match what {d.target.displayName} would write, so it keeps them and
						adds one more of its own: {d.draft + 1} tokens from one pass.
					{:else if round.kept === 0}
						The first guess is wrong, so {d.target.displayName} drops all {d.draft} and writes
						<span class="mono">{displayToken(round.added.text)}</span> itself: one token, the same as
						without a drafter.
					{:else}
						The first {round.kept}
						{round.kept === 1 ? 'guess matches' : 'guesses match'}. At the first wrong one, {d
							.target.displayName} writes <span class="mono">{displayToken(round.added.text)}</span>
						instead and drops the rest: {round.kept + 1} tokens from one pass.
					{/if}
				</p>
			</div>

			<p class="count" aria-live="polite">
				{plural(after, 'token')} in {plural(stepper.index + 1, 'pass')} of {d.target.displayName};
				without the drafter, {plural(after, 'pass')}.
				{#if stepper.atEnd}
					Done, and the text is exactly what {d.target.displayName} writes on its own.
				{/if}
			</p>
		{/snippet}
	</Loading>

	{#snippet controls()}
		<StepController
			{stepper}
			label="Passes"
			describe={(i) => `Pass ${i + 1} of ${stepper.count}`}
		/>
	{/snippet}
</WidgetFrame>

<style>
	.text {
		white-space: pre-wrap;
		min-height: 3em;
		margin: 0 0 var(--space-3);
	}

	.prompt-text {
		color: var(--ink-muted);
	}

	.text strong {
		color: var(--c-vector-ink);
		background: var(--c-vector-tint);
	}

	.round {
		padding: var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}

	.round p {
		margin: 0 0 var(--space-2);
	}

	.chips {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-2);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.chips li {
		display: grid;
		justify-items: center;
		gap: 2px;
	}

	.verdict {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--ink-muted);
	}

	.kept .verdict {
		color: var(--c-vector-ink);
		font-weight: 600;
	}

	.rejected :global(.chip) {
		text-decoration: line-through;
	}

	.added .verdict {
		color: var(--c-prob-ink);
		font-weight: 600;
	}

	.explain {
		font-size: 0.9rem;
	}

	.count {
		margin: var(--space-3) 0 0;
		font-size: 0.9rem;
		color: var(--ink-muted);
	}
</style>
