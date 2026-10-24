<script lang="ts">
	import { all, then, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { scrollable } from '#lib/components/ui/scrollable.ts';
	import ToolCallCard from '#lib/components/primitives/ToolCallCard.svelte';
	import type { AgentRun } from '#lib/harness/agent.ts';
	import { FakeFiles, INJECTED_PAGE, START_FILES, runTool } from '#lib/harness/tools.ts';

	const STEP_LIMIT = 3;
	const GUARDS = {
		none: { label: 'No guardrails', run: 'inject-none' },
		ask: { label: 'Ask before deleting', run: 'inject-ask' },
		allowlist: { label: 'Only safe tools', run: 'inject-allowlist' },
		limit: { label: `Stop after ${STEP_LIMIT} steps`, run: 'inject-none' }
	} as const;
	type Guard = keyof typeof GUARDS;

	const data = then(
		all([
			useDataset('agent/inject-none'),
			useDataset('agent/inject-ask'),
			useDataset('agent/inject-allowlist')
		]),
		([none, ask, allowlist]): Record<string, AgentRun> => ({
			'inject-none': none,
			'inject-ask': ask,
			'inject-allowlist': allowlist
		})
	);

	let guard = $state<Guard>('none');
	const id = $props.id();
	const split = INJECTED_PAGE.indexOf('</tool_response>');

	function view(runs: Record<string, AgentRun>, g: Guard) {
		const run = runs[GUARDS[g].run];
		const steps = g === 'limit' ? run.steps.slice(0, STEP_LIMIT) : run.steps;
		// Replay the calls on a fresh fake file system to show what's left.
		const files = new FakeFiles();
		for (const s of steps) {
			if (s.call && !s.blocked && run.tools.some((t) => t.name === s.call!.name))
				runTool(s.call, files);
		}
		const stopped =
			g === 'limit'
				? 'The harness stopped the run at the step limit.'
				: run.finished
					? 'The model gave a final answer.'
					: `The run hit its limit of ${run.maxSteps} model calls without an answer.`;
		return { run, steps, files: files.names, stopped };
	}
</script>

<WidgetFrame
	title="A poisoned web page"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (guard = 'none')}
>
	<Loading promise={data}>
		{#snippet children(runs)}
			{@const v = view(runs, guard)}
			<p class="task"><span class="label">You ask</span> “{v.run.task}”</p>
			<div class="page">
				<p class="label">The page the agent reads (a tool result)</p>
				<pre>{INJECTED_PAGE.slice(0, split)}<mark>{INJECTED_PAGE.slice(split)}</mark></pre>
			</div>

			<fieldset class="pick">
				<legend class="label">Guardrail in the harness</legend>
				{#each Object.entries(GUARDS) as [key, g] (key)}
					<label
						><input type="radio" name="{id}-g" bind:group={guard} value={key} /> {g.label}</label
					>
				{/each}
			</fieldset>

			<ol class="log" {@attach scrollable} aria-label="What the agent did">
				{#each v.steps as s, i (i)}
					<li>
						{#if s.call}
							<ToolCallCard call={s.call} result={s.result} blocked={s.blocked} />
						{:else}
							<p class="answer"><span class="label">Answer</span> {s.thought}</p>
						{/if}
					</li>
				{/each}
			</ol>
			<p class="stopped">{v.stopped}</p>

			<div class="files" aria-live="polite">
				<span class="label">Your files afterwards</span>
				<ul>
					{#each START_FILES as f (f)}
						<li class:gone={!v.files.includes(f)}>{f}{v.files.includes(f) ? '' : ' (deleted)'}</li>
					{/each}
				</ul>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.task {
		margin-top: 0;
	}

	.page pre {
		white-space: pre-wrap;
		font-size: 0.8rem;
		background: var(--surface-2);
		border-left: 3px solid var(--c-attention);
		padding: var(--space-2) var(--space-3);
		margin: 0 0 var(--space-3);
	}

	mark {
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.pick {
		border: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	legend {
		margin-bottom: var(--space-1);
	}

	.log {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-2);
		max-height: 28rem;
		overflow: auto;
	}

	.answer {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		background: var(--c-vector-tint);
		border-radius: var(--radius);
		white-space: pre-wrap;
	}

	.answer .label {
		display: block;
	}

	.stopped {
		font-family: var(--font-sans);
		font-size: 0.85rem;
		color: var(--ink-muted);
	}

	.files ul {
		list-style: none;
		padding: 0;
		margin: var(--space-1) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.files li {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		padding: 2px var(--space-2);
		border: 1.5px solid var(--c-vector);
		border-radius: 3px;
	}

	.files li.gone {
		border-color: var(--c-loss);
		color: var(--c-loss-ink);
		text-decoration: line-through;
	}
</style>
