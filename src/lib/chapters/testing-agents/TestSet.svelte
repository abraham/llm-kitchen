<script lang="ts">
	import { all, andThen, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import type { AgentRun } from '#lib/harness/agent.ts';
	import {
		TEST_CASES,
		answerCheck,
		filesKept,
		graderAgreement,
		type Check,
		type Grade
	} from '#lib/harness/evals.ts';

	const DEFAULT_READ = 'math-no-tools';
	const data = andThen(
		all([useDataset('agent/grades'), all(TEST_CASES.map((c) => useDataset(`agent/${c.run}`)))]),
		([grades, runs]) =>
			TEST_CASES.map((c, i) => {
				const run = runs[i] as AgentRun;
				return {
					...c,
					answer: answerCheck(run, c.expect),
					files: filesKept(run),
					graded: grades.cases[i]
				};
			})
	);

	let reference = $state(false);
	let read = $state<string>(DEFAULT_READ);

	const MARK = { pass: '✓ pass', fail: '✗ fail', none: 'no answer', unclear: '? unclear' };
	const gradeOf = (g: { alone: Grade | null; withReference: Grade | null }) =>
		reference ? g.withReference : g.alone;

	function reset() {
		reference = false;
		read = DEFAULT_READ;
	}
</script>

{#snippet mark(result: Check | Grade['verdict'])}
	<span class="mark {result}">{MARK[result]}</span>
{/snippet}

<WidgetFrame
	title="Seven tests, three kinds of check"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={reset}
>
	<Loading promise={data}>
		{#snippet children(rows)}
			{@const agreement = graderAgreement(
				rows.map((r) => ({ check: r.answer, grade: gradeOf(r.graded) }))
			)}
			{@const shown = rows.find((r) => r.run === read)!}
			{@const grade = gradeOf(shown.graded)}
			<Toggle label="Show the grader a correct answer" bind:checked={reference} />

			<ScrollBox label="The test results">
				<table class="data">
					<caption>Each recorded run, checked by code and graded by a model</caption>
					<thead>
						<tr>
							<th scope="col">Test</th>
							<th scope="col">Answer has…</th>
							<th scope="col">Files all kept</th>
							<th scope="col">Model grader</th>
						</tr>
					</thead>
					<tbody aria-live="polite">
						{#each rows as r (r.run)}
							{@const g = gradeOf(r.graded)}
							<tr>
								<th scope="row">{r.label}</th>
								<td>
									<span class="expect mono">{r.expect}</span>
									{@render mark(r.answer)}
								</td>
								<td>{@render mark(r.files)}</td>
								<td
									>{#if g}{@render mark(g.verdict)}{:else}{@render mark('none')}{/if}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</ScrollBox>
			<Status>
				The grader agrees with the answer check on <span class="mono">{agreement.agree}</span> of
				the {agreement.graded} answers{reference ? ', given a correct answer' : ''}.
			</Status>

			<Choice
				legend="Read the grading of"
				appearance="select"
				layout="inline"
				options={rows
					.filter((r) => r.graded.answer !== null)
					.map((r) => ({ value: r.run, label: r.label }))}
				bind:value={read}
			/>
			<div class="reading">
				<p class="label">The answer</p>
				<ScrollBox label="The answer being graded" framed maxHeight="9rem">
					<p class="text">{shown.graded.answer}</p>
				</ScrollBox>
				{#if reference}
					<p class="label">The correct answer the grader is shown</p>
					<p class="text reference">{shown.graded.reference}</p>
				{/if}
				<p class="label">The grader’s reply</p>
				<p class="text grader">{grade?.reply}</p>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	td {
		text-align: left;
	}

	.expect {
		display: block;
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.mark {
		white-space: nowrap;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		padding: 0 var(--space-1);
		border-radius: 3px;
	}

	.mark.pass {
		background: var(--c-vector-tint);
		color: var(--c-vector-ink);
	}

	.mark.fail {
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.mark.none,
	.mark.unclear {
		color: var(--ink-muted);
	}

	.reading {
		margin-top: var(--space-2);
	}

	.reading .label {
		margin: var(--space-2) 0 var(--space-1);
	}

	.text {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 0.9rem;
	}

	.reference,
	.grader {
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--c-harness);
		background: var(--c-harness-tint);
	}
</style>
