<script lang="ts">
	import { andThen, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import { describeToken, displayToken, formatCount } from '#lib/components/primitives/format.ts';
	import {
		annotateRound,
		describeRoundSlot,
		writtenAfter,
		type AnnotatedRoundSlot,
		type RoundSlotKind,
		type SpeculativeRecording
	} from '#lib/math/speculative.ts';

	const data = useDataset('speculative/drafts');
	let choice = $state(0);
	let stepper = $state(new Stepper(1));
	let picked = $state<{ key: string; index: number } | null>(null);

	andThen(data, (d) => (stepper = new Stepper(d.runs[0].rounds.length)));

	const plural = (n: number, word: string) =>
		`${n} ${n === 1 ? word : word.endsWith('s') ? `${word}es` : `${word}s`}`;

	const MARKER: Record<RoundSlotKind, string> = {
		kept: '✓',
		wrong: '×',
		dropped: '−',
		added: '+'
	};

	function pick(d: SpeculativeRecording, i: number) {
		choice = i;
		picked = null;
		stepper = new Stepper(d.runs[i].rounds.length);
	}

	function resolveSlot(slots: readonly AnnotatedRoundSlot[], key: string): AnnotatedRoundSlot {
		if (picked && picked.key === key && slots[picked.index]) {
			return slots[picked.index];
		}
		return slots.find((s) => s.kind === 'wrong') ?? slots[slots.length - 1];
	}
</script>

<WidgetFrame
	title="A small model guesses, a big one checks"
	label="Step through"
	source={{ kind: 'recorded', model: 'GPT-2 small and GPT-2 medium' }}
	onreset={() => {
		picked = null;
		stepper.reset();
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const run = d.runs[choice]}
			{@const round = run.rounds[stepper.index]}
			{@const before = writtenAfter(run, stepper.index)}
			{@const after = writtenAfter(run, stepper.index + 1)}
			{@const roundKey = `${choice}-${stepper.index}`}
			{@const slots = annotateRound(round)}
			{@const selected = resolveSlot(slots, roundKey)}
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
				<div class="chips" role="group" aria-label="The guesses and the big model's verdict">
					{#each slots as slot (slot.index)}
						{@const verdict = slot.kind === 'added' ? `${d.target.displayName}'s own` : slot.kind}
						<button
							type="button"
							class="slot {slot.kind}"
							aria-pressed={selected.index === slot.index}
							onclick={() => (picked = { key: roundKey, index: slot.index })}
						>
							<span class="mark mono" aria-hidden="true">{MARKER[slot.kind]}</span>
							<span class="tok mono" aria-hidden="true">{displayToken(slot.token.text)}</span>
							<span class="verdict" aria-hidden="true">{verdict}</span>
							<span class="visually-hidden">
								{describeToken(slot.token.text, slot.token.id)}, {verdict}
							</span>
						</button>
					{/each}
				</div>
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

				<dl class="detail" aria-label="Selected token verdict">
					<div>
						<dt class="label">Token</dt>
						<dd class="mono">
							<strong>{displayToken(selected.token.text)}</strong>
							<span class="muted">ID {formatCount(selected.token.id)}</span>
						</dd>
					</div>
					<div>
						<dt class="label">Verdict</dt>
						<dd class="diff mono">
							{#if selected.kind === 'wrong' && selected.counterpart}
								<span class="old">{displayToken(selected.token.text)}</span>
								<span aria-hidden="true">→</span>
								<span class="repl">{displayToken(selected.counterpart.text)}</span>
							{:else if selected.kind === 'added' && selected.counterpart}
								<span class="old">{displayToken(selected.counterpart.text)}</span>
								<span aria-hidden="true">→</span>
								<span class="repl">{displayToken(selected.token.text)}</span>
							{:else if selected.kind === 'kept'}
								<span>Agreed with {d.target.displayName}</span>
							{:else if selected.kind === 'dropped'}
								<span>Discarded after guess #{round.kept + 1}</span>
							{:else}
								<span>Bonus token (all {d.draft} matched)</span>
							{/if}
						</dd>
					</div>
				</dl>

				<Status lines={2}>
					{describeRoundSlot(
						selected,
						d.drafter.displayName,
						d.target.displayName,
						round.kept,
						d.draft
					)}
				</Status>
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
		margin: 0 0 var(--space-2);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3.6rem;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius);
		border: 1.5px solid var(--rule);
		background: var(--surface-2);
		color: var(--ink);
		line-height: 1.25;
		transition:
			transform var(--duration) var(--ease),
			border-color var(--duration) var(--ease);
	}

	.slot.kept {
		border-color: var(--c-vector);
		background: var(--c-vector-tint);
		color: var(--c-vector-ink);
	}

	.slot.wrong {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.slot.wrong .tok,
	.slot.dropped .tok {
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.slot.dropped {
		border-style: dashed;
		color: var(--ink-muted);
	}

	.slot.added {
		border-color: var(--c-prob);
		background: var(--c-prob-tint);
		color: var(--c-prob-ink);
	}

	.slot[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.mark {
		font-size: 0.7rem;
	}

	.tok {
		font-size: 0.95rem;
		font-weight: 600;
		white-space: pre;
	}

	.verdict {
		font-family: var(--font-sans);
		font-size: 0.7rem;
	}

	.explain {
		font-size: 0.9rem;
	}

	.detail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: var(--space-2) var(--space-4);
		margin: var(--space-2) 0 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.detail dt {
		margin-bottom: 2px;
	}

	.detail dd {
		margin: 0;
		font-size: 0.9rem;
	}

	.muted {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.diff {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.old {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		text-decoration: line-through;
		font-size: 0.85rem;
	}

	.repl {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-prob);
		background: var(--c-prob-tint);
		color: var(--c-prob-ink);
		font-size: 0.85rem;
	}

	.count {
		margin: var(--space-3) 0 0;
		font-size: 0.9rem;
		color: var(--ink-muted);
	}
</style>
