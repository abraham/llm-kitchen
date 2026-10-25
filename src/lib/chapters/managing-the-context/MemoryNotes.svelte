<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import { MEMORY_FACTS, remembered, type NotesKind } from '#lib/harness/memory.ts';

	const data = useDataset('agent/memory');
	type Mode = 'none' | NotesKind;
	const MODES: { value: Mode; label: string }[] = [
		{ value: 'none', label: 'No notes' },
		{ value: 'general', label: 'Notes from an open request' },
		{ value: 'specific', label: 'Notes from a specific request' }
	];
	const DEFAULT: Mode = 'general';
	let mode = $state<Mode>(DEFAULT);
</script>

<WidgetFrame
	title="Notes for next time"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (mode = DEFAULT)}
>
	<Loading promise={data}>
		{#snippet children(rec)}
			{@const kept = mode === 'none' ? null : rec.notes[mode]}
			{@const answers = kept ? kept.answers : rec.without}
			<p class="intro">
				At the end of the long chat about your class, the harness can ask the model to write notes,
				and put them in the system prompt of your next chat.
			</p>
			<Choice legend="What the next chat starts with" options={MODES} bind:value={mode} />

			{#if kept}
				<p class="label">The harness asked</p>
				<p class="request">“{kept.request}”</p>
				<p class="label">
					The notes: {formatCount(kept.tokens)} tokens instead of the whole {formatCount(
						rec.chatTokens
					)}-token chat
				</p>
				<ScrollBox label="The notes" framed maxHeight="12rem">
					<p class="notes">{kept.notes}</p>
				</ScrollBox>
			{/if}

			<p class="label">A new chat</p>
			<ol class="answers" aria-live="polite">
				{#each answers as a (a.question)}
					{@const ok = remembered(a)}
					<li>
						<p class="question">You: {a.question}</p>
						<p class="answer">{a.answer}</p>
						<p class="mark" class:ok>
							{ok ? '✓ Right' : '✗ Not what you said'}: the earlier chat said {MEMORY_FACTS[
								a.question
							]}.
						</p>
					</li>
				{/each}
			</ol>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.intro {
		margin-top: 0;
	}

	.label {
		margin: var(--space-3) 0 var(--space-1);
	}

	.request {
		margin: 0;
		font-style: italic;
	}

	.notes {
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.85rem;
	}

	.answers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-3);
	}

	.answers p {
		margin: 0;
	}

	.question {
		font-weight: 600;
	}

	.answer {
		padding: var(--space-1) var(--space-3);
		border-left: 3px solid var(--c-harness);
		background: var(--c-harness-tint);
		white-space: pre-wrap;
	}

	.mark {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--c-loss-ink);
	}

	.mark.ok {
		color: var(--c-vector-ink);
	}
</style>
