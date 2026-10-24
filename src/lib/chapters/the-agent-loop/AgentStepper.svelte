<script lang="ts">
	import { then, useDatasets } from '#lib/datasets/use.ts';
	import { label } from '#lib/curriculum/index.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ToolCallCard from '#lib/components/primitives/ToolCallCard.svelte';
	import type { AgentRun, AgentStep } from '#lib/harness/agent.ts';
	import type { AgentRunName } from '#lib/datasets/registry.ts';
	import { formatCount } from '#lib/components/primitives/format.ts';

	let {
		run: name = 'agent-cat',
		title = 'The agent loop'
	}: { run?: AgentRunName; title?: string } = $props();

	type Event = { kind: 'model' | 'tool'; step: AgentStep; n: number };

	function events(run: AgentRun): Event[] {
		return run.steps.flatMap((step, i) => [
			{ kind: 'model' as const, step, n: i + 1 },
			...(step.call ? [{ kind: 'tool' as const, step, n: i + 1 }] : [])
		]);
	}

	function describe(e: Event, run: AgentRun): string {
		if (e.kind === 'tool') {
			return e.step.blocked
				? `The harness refuses to run ${e.step.call!.name} and tells the model so.`
				: `The harness runs ${e.step.call!.name} and adds the result to the conversation.`;
		}
		const lead = `Model call ${e.n} of at most ${run.maxSteps}, reading ${formatCount(e.step.promptTokens)} tokens.`;
		return e.step.call
			? `${lead} It writes a tool call, then stops.`
			: `${lead} No tool call this time, so this is the answer and the loop ends.`;
	}

	const datasets = useDatasets();
	const data = $derived(datasets(`agent/${name}`));
	// Preloaded runs get the right stepper at once (and in the prerendered HTML); fetched ones
	// start with a placeholder that's overridden when the run arrives, unless the run changed.
	let stepper = $derived.by(() => {
		const current = data;
		const ready = then(current, (run) => new Stepper(events(run).length));
		if (ready instanceof Stepper) return ready;
		ready.then((s) => {
			if (data === current) stepper = s;
		});
		return new Stepper(1);
	});
</script>

<WidgetFrame
	{title}
	label="Step through"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => stepper.reset()}
>
	<Loading promise={data}>
		{#snippet children(run)}
			{@const all = events(run)}
			{@const current = all[Math.min(stepper.index, all.length - 1)]}
			{@const end = stepper.index === all.length - 1}
			<p class="task"><span class="label">Task</span> {run.task}</p>

			<div class="loops" aria-hidden="true">
				<div class="outer">
					<span class="loop-label">Harness loop · step {current.n} of at most {run.maxSteps}</span>
					<div class="row">
						<div class="node" class:on={current.kind === 'model'}>
							Call the model
							<div class="inner">
								Token loop ({label('generating-text')}): predict, pick, append…
							</div>
						</div>
						<span class="arrow">→</span>
						<div class="node" class:on={current.kind === 'tool'}>Run the tool, add the result</div>
						<span class="arrow">↺</span>
						<div class="node stop" class:on={end && current.kind === 'model'}>
							Stop: an answer{run.finished ? '' : ' or the step limit'}
						</div>
					</div>
				</div>
			</div>

			<ol class="log" aria-label="What has happened so far">
				{#each all.slice(0, stepper.index + 1) as e, i (i)}
					<li class={e.kind} class:latest={i === stepper.index}>
						{#if e.kind === 'model'}
							<span class="who">Model · {formatCount(e.step.promptTokens)} tokens in</span>
							{#if e.step.thought}<p class="thought">{e.step.thought}</p>{/if}
							{#if e.step.call}<p class="mono small">
									{e.step.output.slice(e.step.output.indexOf('<tool_call>'))}
								</p>{/if}
						{:else}
							<span class="who">Harness</span>
							<ToolCallCard call={e.step.call!} result={e.step.result} blocked={e.step.blocked} />
						{/if}
					</li>
				{/each}
			</ol>
			<p class="explain" aria-live="polite">{describe(current, run)}</p>
		{/snippet}
	</Loading>

	{#snippet controls()}
		<StepController {stepper} />
	{/snippet}
</WidgetFrame>

<style>
	.task {
		margin-top: 0;
	}

	.loops {
		margin-bottom: var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.outer {
		border: 2px dashed var(--c-harness);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3) var(--space-3);
	}

	.loop-label {
		display: block;
		color: var(--c-harness-ink);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.node {
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		padding: var(--space-2);
		background: var(--surface);
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease);
	}

	.node.on {
		border-color: var(--c-harness);
		background: var(--c-harness-tint);
		font-weight: 600;
	}

	.inner {
		margin-top: var(--space-1);
		padding: 2px var(--space-2);
		border: 1px dashed var(--c-prob);
		border-radius: 3px;
		font-weight: 400;
		font-size: 0.72rem;
		color: var(--c-prob-ink);
	}

	.arrow {
		color: var(--c-harness-ink);
		font-size: 1.1rem;
	}

	.log {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-2);
	}

	.log li {
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--rule);
	}

	.log li.model {
		border-left-color: var(--c-vector);
	}

	.log li.tool {
		border-left-color: var(--c-harness);
	}

	.log li.latest {
		background: var(--surface-2);
	}

	.who {
		display: block;
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: var(--space-1);
	}

	.thought {
		margin: 0;
		white-space: pre-wrap;
	}

	.small {
		font-size: 0.75rem;
		margin: var(--space-1) 0 0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-3) 0 0;
	}
</style>
