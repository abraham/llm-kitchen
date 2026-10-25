<script lang="ts">
	import { all, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ToolCallCard from '#lib/components/primitives/ToolCallCard.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import { parseToolCall, type ChatTurn } from '#lib/harness/agent.ts';
	import { CALCULATOR_SCHEMA, calculator, type ToolCall } from '#lib/harness/tools.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';

	type Turn = { output: string; call?: ToolCall; result?: string; answer?: string; done: boolean };

	const data = all([useDataset('agent/math-no-tools'), useDataset('agent/math-tools')]);
	const option = useProvider('chat', 'Qwen2.5-1.5B-Instruct');
	const id = $props.id();
	let tools = $state(false);
	const stepper = new Stepper(4);
	let draft = $state('');
	/** The visitor's own question, once asked; live only. */
	let own = $state('');
	/** Live runs, by question: without tools, and with the calculator. */
	let runs = $state<Record<string, { off: Turn; on: Turn }>>({});
	let problem = $state('');

	const STEPS = [
		'The model writes a tool call: plain text in the format its tool instructions asked for.',
		'The harness spots the call and reads out the tool name and the arguments.',
		'The harness runs the calculator. The model never runs anything itself.',
		'The harness adds the result to the prompt and calls the model again. Now it only has to copy the number.'
	];
	const lastNumber = (text: string) => text.match(/\d[\d,]*\d|\d/g)?.at(-1) ?? '?';
	const n = (s: string) => formatCount(Number(s.replaceAll(',', '')));
	/** The arithmetic in a question, for checking the answer: the longest run of numbers and signs. */
	const expression = (question: string) =>
		question
			.match(/\d[\d.,]*(?:\s*[-+*/×÷]\s*\(?\s*\d[\d.,]*\)?)+/g)
			?.toSorted((a, b) => b.length - a.length)[0]
			?.replaceAll(',', '');

	async function run(question: string, offSystem: string, onSystem: string) {
		const provider = option.provider;
		if (!provider?.reply || question in runs) return;
		runs[question] = {
			off: { output: '', done: false },
			on: { output: '', done: false }
		};
		const { off, on } = runs[question];
		const ask = (system: string): ChatTurn[] => [
			{ role: 'system', content: system },
			{ role: 'user', content: question }
		];
		const r = await provider.reply(
			{ messages: ask(offSystem) },
			{ maxTokens: 400, ontext: (text) => (off.output = text) }
		);
		Object.assign(off, { output: r.text, done: true });

		// The harness loop, once: call the model with the calculator, run the call it writes, call again.
		const messages = ask(onSystem);
		const first = await provider.reply(
			{ messages, tools: [CALCULATOR_SCHEMA] },
			{ maxTokens: 200, ontext: (text) => (on.output = text) }
		);
		const { thought, call } = parseToolCall(first.text);
		on.output = first.text;
		if (!call) {
			Object.assign(on, { answer: thought, done: true });
			return;
		}
		const result =
			call.name === 'calculator'
				? calculator(call.arguments.expression ?? '')
				: `Error: there is no tool named ${call.name}.`;
		Object.assign(on, { call, result });
		const second = await provider.reply(
			{
				messages: [
					...messages,
					{
						role: 'assistant',
						content: thought,
						tool_calls: [{ type: 'function', function: call }]
					},
					{ role: 'tool', name: call.name, content: result }
				],
				tools: [CALCULATOR_SCHEMA]
			},
			{ maxTokens: 200, ontext: (text) => (on.answer = text) }
		);
		Object.assign(on, { answer: parseToolCall(second.text).thought, done: true });
	}

	// Live, the question on show is put to the model in this browser, without and with the tool.
	$effect(() => {
		const mine = own;
		if (!option.live) return;
		void Promise.resolve(data)
			.then(([off, on]) => {
				problem = '';
				return run(mine || off.task, off.system, on.system);
			})
			.catch((error) => {
				problem = error instanceof Error ? error.message : String(error);
				delete runs[mine];
			});
	});
</script>

<WidgetFrame
	title="Tools off, tools on"
	label="Step through"
	source={option.source}
	live={option}
	onreset={() => {
		tools = false;
		stepper.reset();
		draft = own = '';
	}}
>
	<Loading promise={data}>
		{#snippet children([off, on])}
			{@const question = (option.live && own) || off.task}
			{@const live = option.live ? runs[question] : undefined}
			{@const exact = expression(question)}
			{@const correct = exact ? calculator(exact) : undefined}
			{@const recorded: Turn = {
				output: on.steps[0].output,
				call: on.steps[0].call,
				result: on.steps[0].call ? calculator(on.steps[0].call.arguments.expression) : undefined,
				answer: on.steps[1]?.thought,
				done: true
			}}
			{@const turn = option.live ? live?.on : recorded}
			{#if option.live}
				<form
					class="own"
					onsubmit={(e) => {
						e.preventDefault();
						own = draft.trim();
						stepper.reset();
					}}
				>
					<label class="label" for="{id}-own">Your own sum</label>
					<input
						id="{id}-own"
						type="text"
						bind:value={draft}
						placeholder="What is 987 × 654?"
						autocomplete="off"
					/>
					<button type="submit">Ask</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			<p class="task">“{question}”</p>
			<Choice
				legend="Tools"
				hideLabel
				options={[
					{ value: false, label: 'Tools off' },
					{ value: true, label: 'Tools on (a calculator)' }
				]}
				bind:value={tools}
			/>

			{#if !tools}
				{@const reply = option.live ? live?.off : { output: off.steps[0].output, done: true }}
				<p class="label">The model’s reply, written token by token</p>
				<ScrollBox label="The model's reply" maxHeight="16rem" framed
					><pre class="reply" aria-busy={!reply?.done}>{reply?.output ?? ''}</pre></ScrollBox
				>
				{#if reply?.done && correct && !correct.startsWith('Error')}
					{@const guess = lastNumber(reply.output)}
					<p class="verdict" aria-live="polite">
						Its answer: <strong class="mono" class:wrong={guess.replaceAll(',', '') !== correct}
							>{guess === '?' ? 'none' : n(guess)}</strong
						>. The right answer is
						<strong class="mono">{n(correct)}</strong>. Every digit was predicted like any other
						token.
					</p>
				{/if}
			{:else if turn}
				<div class="flow">
					<div class="box model">
						<p class="who">Model writes</p>
						<pre class="raw" aria-busy={!turn.call && !turn.done}>{turn.output}</pre>
					</div>
					{#if turn.call}
						{#if stepper.index >= 1}
							<div class="box">
								<p class="who">Harness reads{stepper.index >= 2 ? ' and runs' : ''}</p>
								<ToolCallCard
									call={turn.call}
									result={stepper.index >= 2 ? turn.result : undefined}
								/>
							</div>
						{/if}
						{#if stepper.index >= 3}
							<div class="box model">
								<p class="who">Model writes</p>
								<p class="answer" aria-busy={!turn.done}>{turn.answer ?? ''}</p>
							</div>
						{/if}
					{:else if turn.done}
						<p class="explain">It answered without calling the calculator.</p>
					{/if}
				</div>
				{#if turn.call}<p class="explain">{STEPS[stepper.index]}</p>{/if}
			{/if}
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Ask Qwen2.5-0.5B-Instruct your own sum, with and without a calculator, live."
	/>

	{#snippet controls()}
		{#if tools}<StepController {stepper} describe={(i) => STEPS[i]} />{/if}
	{/snippet}
</WidgetFrame>

<style>
	.own {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
	}

	.own input {
		font: inherit;
		min-width: 12rem;
		flex: 1;
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.task {
		font-size: 1.05rem;
		margin: 0 0 var(--space-2);
	}

	.reply {
		margin: 0;
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.raw {
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.75rem;
		background: var(--surface-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		margin: 0;
		max-height: 16rem;
		overflow: auto;
	}

	.verdict {
		margin: var(--space-3) 0 0;
	}

	.wrong {
		color: var(--c-loss-ink);
	}

	.flow {
		display: grid;
		gap: var(--space-3);
	}

	.who {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink-muted);
		margin: 0 0 var(--space-1);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.answer {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		background: var(--c-vector-tint);
		border-radius: var(--radius);
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-3) 0 0;
	}
</style>
