<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { QUESTIONS, TASKS, concerns, verdict, type Answers, type QuestionId } from './data.ts';

	const CUSTOM = 'custom';
	const first = TASKS[0];

	let taskId = $state(first.id);
	let answers = $state<Answers>({ ...first.answers });

	function pick(id: string) {
		taskId = id;
		const preset = TASKS.find((t) => t.id === id);
		if (preset) answers = { ...preset.answers };
	}

	function answer(id: QuestionId, value: boolean) {
		answers[id] = value;
		taskId = CUSTOM;
	}

	const found = $derived(concerns(answers));
	const YES_NO = [
		{ value: true, label: 'Yes' },
		{ value: false, label: 'No' }
	];
</script>

<WidgetFrame
	title="Should a model do this?"
	source={{ kind: 'recorded' }}
	onreset={() => pick(first.id)}
>
	<Choice
		legend="Task"
		appearance="select"
		options={[
			...TASKS.map((t) => ({ value: t.id, label: t.label })),
			{ value: CUSTOM, label: 'Your own task' }
		]}
		bind:value={() => taskId, pick}
	/>

	<ol class="questions">
		{#each QUESTIONS as q (q.id)}
			<li class:warn={answers[q.id] !== q.fits}>
				<Choice
					legend={q.text}
					options={YES_NO}
					layout="inline"
					bind:value={() => answers[q.id], (v) => answer(q.id, v)}
				/>
			</li>
		{/each}
	</ol>

	<p class="verdict" class:good={!found.length} aria-live="polite">{verdict(answers)}</p>

	{#each found as q (q.id)}
		<section class="card" aria-label={q.concern}>
			<p class="concern">{q.concern}</p>
			<p class="evidence">{q.evidence}</p>
			<p>
				<strong>Instead:</strong>
				{q.instead}
				(<ChapterRef to={q.chapters[0]} />, <ChapterRef to={q.chapters[1]} bare />)
			</p>
		</section>
	{/each}
</WidgetFrame>

<style>
	.questions {
		--block-space: 0;
		display: grid;
		gap: var(--space-2);
		margin: var(--space-3) 0;
		padding-left: 1.5rem;
	}

	.questions li {
		padding: var(--space-1) var(--space-2);
		border-left: 3px solid var(--c-vector);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.questions li.warn {
		border-left-color: var(--c-loss);
	}

	.verdict {
		font-weight: 600;
		color: var(--c-loss-ink);
	}

	.verdict.good {
		color: var(--c-vector-ink);
	}

	.card {
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule);
		border-left: 3px solid var(--c-loss);
		border-radius: var(--radius);
	}

	.card p {
		margin: var(--space-1) 0;
	}

	.concern {
		font-weight: 600;
	}

	.evidence {
		color: var(--ink-muted);
	}
</style>
