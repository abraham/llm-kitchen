<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';

	const QUESTIONS = [
		{
			q: 'What does the model itself produce each time it runs?',
			options: [
				'A whole reply',
				'Probabilities for the next token',
				'A search of the web',
				'A list of facts it checked'
			],
			answer: 1,
			why: 'One run gives probabilities for one next token; the reply is built by a loop (Ch 11).'
		},
		{
			q: 'Why might a model miscount the letters in “strawberry”?',
			options: [
				'It reads tokens, not letters',
				'It was never shown the word',
				'Counting is banned in training',
				'Its temperature is too high'
			],
			answer: 0,
			why: 'The word reaches it as one or a few token numbers (Ch 4, Ch 14).'
		},
		{
			q: 'How does attention help with “The trophy didn’t fit in the suitcase because it was too big”?',
			options: [
				'It looks up the answer online',
				'It lets each token pull in information from any earlier token',
				'It makes the vocabulary bigger',
				'It removes the word “it”'
			],
			answer: 1,
			why: 'Attention weights earlier tokens by relevance (Ch 9).'
		},
		{
			q: 'When an assistant uses a calculator, who actually runs it?',
			options: ['The model', 'The harness', 'The tokenizer', 'The user'],
			answer: 1,
			why: 'The model only writes a tool call as text; the harness runs it (Ch 16).'
		},
		{
			q: 'A web page tells the agent to delete your files. What stops it?',
			options: [
				'The model always ignores web pages',
				'Guardrails in the harness, like asking you first',
				'The context window',
				'Nothing can help'
			],
			answer: 1,
			why: 'To the model, the page is just more text; the harness has to supply the safety (Ch 19).'
		},
		{
			q: 'Why can BERT fill in a blank in the middle of a sentence better than GPT-2?',
			options: [
				'It has a bigger vocabulary',
				'Its attention can look at the words after the blank too',
				'It was trained on more text',
				'It uses a higher temperature'
			],
			answer: 1,
			why: 'An encoder lets every token see every other token, both before and after (Ch 20).'
		},
		{
			q: 'What does a reasoning model do differently from an ordinary chat model?',
			options: [
				'It looks answers up in a database',
				'It runs a separate logic engine',
				'It writes scratch work as tokens before answering',
				'It never makes mistakes'
			],
			answer: 2,
			why: 'It is still predicting tokens; it was trained to write its working first (Ch 25).'
		}
	];

	let picks = $state<(number | null)[]>(QUESTIONS.map(() => null));
	let checked = $state(false);
	const score = $derived(picks.filter((p, i) => p === QUESTIONS[i].answer).length);
	const id = $props.id();
</script>

<WidgetFrame
	title="Quick check"
	source={{ kind: 'computed' }}
	onreset={() => {
		picks = QUESTIONS.map(() => null);
		checked = false;
	}}
>
	<ol class="questions">
		{#each QUESTIONS as item, i (i)}
			<li>
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
						<p class="why">{picks[i] === item.answer ? '✓' : '✗'} {item.why}</p>
					{/if}
				</fieldset>
			</li>
		{/each}
	</ol>

	{#snippet controls()}
		<div class="actions">
			<button
				type="button"
				disabled={checked || picks.includes(null)}
				onclick={() => (checked = true)}
			>
				Check my answers
			</button>
			{#if checked}<span role="status">{score} of {QUESTIONS.length} right.</span>{/if}
		</div>
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
</style>
