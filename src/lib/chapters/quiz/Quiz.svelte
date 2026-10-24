<script lang="ts">
	import { untrack } from 'svelte';
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { chapter } from '#lib/curriculum/index.ts';
	import { levelsAttribute } from '#lib/levels.ts';
	import { level } from '#lib/stores/level.svelte.ts';
	import { QUESTIONS, type QuizQuestion } from './data.ts';

	let { questions = QUESTIONS }: { questions?: readonly QuizQuestion[] } = $props();

	const blank = () => untrack(() => questions.map(() => null));
	let picks = $state<(number | null)[]>(blank());
	let checked = $state(false);
	// Every question is in the HTML; global.css shows the current level's, and only those count.
	const asked = $derived(
		questions
			.map((item, i) => ({ item, i }))
			.filter(({ item }) => !item.levels || item.levels.includes(level.current))
	);
	const score = $derived(asked.filter(({ item, i }) => picks[i] === item.answer).length);
	const revisit = $derived(
		[
			...new Set(
				asked.filter(({ item, i }) => picks[i] !== item.answer).flatMap(({ item }) => item.chapters)
			)
		].sort((a, b) => chapter(a).number - chapter(b).number)
	);
	const id = $props.id();
</script>

<WidgetFrame
	title="Quick check"
	source={{ kind: 'computed' }}
	onreset={() => {
		picks = blank();
		checked = false;
	}}
>
	<ol class="questions">
		{#each questions as item, i (i)}
			<li data-levels={levelsAttribute(item.levels)}>
				<fieldset>
					<legend>{item.q}</legend>
					{#each item.options as option, j (j)}
						<label
							class:right={checked && j === item.answer}
							class:wrong={checked && picks[i] === j && j !== item.answer}
						>
							<input
								type="radio"
								name="{id}-{i}"
								value={j}
								bind:group={picks[i]}
								disabled={checked}
							/>
							{option}
						</label>
					{/each}
					{#if checked}
						<p class="why">
							{picks[i] === item.answer ? '✓' : '✗'}
							{item.why} See
							{#each item.chapters as slug, k (slug)}{k > 0 ? ' and ' : ''}<ChapterRef
									to={slug}
									title
								/>{/each}.
						</p>
					{/if}
				</fieldset>
			</li>
		{/each}
	</ol>

	{#snippet controls()}
		<div class="actions">
			<button
				type="button"
				disabled={checked || asked.some(({ i }) => picks[i] === null)}
				onclick={() => (checked = true)}
			>
				Check my answers
			</button>
			{#if checked}<span role="status">{score} of {asked.length} right.</span>{/if}
		</div>
		{#if checked && revisit.length > 0}
			<div class="revisit">
				<p>Worth another look:</p>
				<ul>
					{#each revisit as slug (slug)}<li><ChapterRef to={slug} title /></li>{/each}
				</ul>
			</div>
		{/if}
	{/snippet}
</WidgetFrame>

<style>
	.questions {
		margin: 0;
		padding-left: var(--space-4);
		display: grid;
		gap: var(--space-3);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-1);
	}

	legend {
		font-weight: 600;
		margin-bottom: var(--space-1);
	}

	label {
		font-size: 0.95rem;
		padding: 2px var(--space-2);
		border-radius: 3px;
	}

	label.right {
		background: var(--c-vector-tint);
	}

	label.wrong {
		background: var(--c-loss-tint);
	}

	.why {
		margin: var(--space-1) 0 0;
		font-size: 0.9rem;
		color: var(--ink-muted);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-family: var(--font-sans);
	}

	.revisit {
		margin-top: var(--space-2);
		font-size: 0.95rem;
	}

	.revisit p,
	.revisit ul {
		margin: 0;
	}
</style>
