<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import PromptText from '#lib/components/primitives/PromptText.svelte';
	import ScrollBox from '#lib/components/ui/ScrollBox.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { chatTemplate } from '#lib/math/chat-template.ts';
	import { lastNumberIs } from '#lib/grading/answers.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';

	type Answer = { text: string; correct: boolean };
	const OWN = -1;
	const REPLY_TOKENS = 250;
	const MATH_TOKENS = 30;

	const data = useDataset('prompts/system');
	const option = useProvider('chat', 'Qwen2.5-1.5B-Instruct');
	const id = $props.id();
	let pick = $state(0);
	let draft = $state('');
	/** The visitor's own system prompt, once asked; live only. */
	let own = $state('');
	/** Live replies to the question, by system prompt. */
	let replies = $state<Record<string, { text: string; tokens: number; done: boolean }>>({});
	/** Live answers to the sums, by `default|question` or `persona|question`. */
	let answers = $state<Record<string, Answer>>({});
	let problem = $state('');

	async function ask(system: string, question: string) {
		const provider = option.provider;
		if (!provider?.reply || system in replies) return;
		replies[system] = { text: '', tokens: 0, done: false };
		try {
			const r = await provider.reply(
				{
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: question }
					]
				},
				{ maxTokens: REPLY_TOKENS, ontext: (text) => (replies[system].text = text) }
			);
			replies[system] = { text: r.text, tokens: r.tokens, done: true };
		} catch (error) {
			delete replies[system];
			throw error;
		}
	}

	async function sums(
		defaultSystem: string,
		persona: string,
		math: { question: string; expected: number }[]
	) {
		for (const m of math) {
			for (const [key, system] of [
				['default', defaultSystem],
				['persona', persona]
			]) {
				const provider = option.provider;
				if (!provider?.reply) return;
				if (`${key}|${m.question}` in answers) continue;
				const r = await provider.reply(
					{
						messages: [
							{ role: 'system', content: system },
							{ role: 'user', content: m.question }
						]
					},
					{ maxTokens: MATH_TOKENS }
				);
				answers[`${key}|${m.question}`] = {
					text: r.text,
					correct: lastNumberIs(r.text, m.expected)
				};
			}
		}
	}

	// Live, the reply on show and every sum are asked of the model in this browser.
	$effect(() => {
		const which = pick;
		const mine = own;
		if (!option.live) return;
		void Promise.resolve(data)
			.then(async (d) => {
				problem = '';
				const system = which === OWN ? mine : d.replies[which].system;
				if (system) await ask(system, d.question);
				await sums(d.replies[0].system, d.persona, d.math);
			})
			.catch((error) => (problem = error instanceof Error ? error.message : String(error)));
	});
</script>

<WidgetFrame
	title="Same question, different system prompts"
	source={option.source}
	live={option}
	onreset={() => {
		pick = 0;
		draft = own = '';
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const choosing = option.live ? pick : Math.max(pick, 0)}
			{@const recorded = d.replies[Math.max(choosing, 0)]}
			{@const system = choosing === OWN ? own : recorded.system}
			{@const name = choosing === OWN ? 'your own' : recorded.name.toLowerCase()}
			{@const live = option.live ? replies[system] : undefined}
			<Choice
				legend="System prompt"
				options={[
					...d.replies.map((r, i) => ({ value: i, label: r.name })),
					...(option.live ? [{ value: OWN, label: 'Your own' }] : [])
				]}
				bind:value={() => choosing, (i) => (pick = i)}
			/>
			{#if option.live && choosing === OWN}
				<form
					class="own"
					onsubmit={(e) => {
						e.preventDefault();
						own = draft.trim();
					}}
				>
					<label class="label" for="{id}-own">Your system prompt</label>
					<input
						id="{id}-own"
						type="text"
						bind:value={draft}
						placeholder="You are a pirate. Answer in one line."
						autocomplete="off"
					/>
					<button type="submit">Ask</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			{#if system}
				<p class="label">What the model reads</p>
				<div class="template">
					<PromptText
						parts={chatTemplate([
							{ role: 'system', content: system },
							{ role: 'user', content: d.question }
						])}
						label="What the model reads"
						maxHeight="none"
						emphasis={['system']}
					/>
				</div>
				<p class="label">
					Its reply ({option.live
						? live?.done
							? `${live.tokens} tokens`
							: 'writing…'
						: `${recorded.tokens} tokens`})
				</p>
				<ScrollBox label="Reply with the {name} system prompt" maxHeight="16rem" framed
					><div class="reply" aria-live="polite" aria-busy={option.live && !live?.done}>
						{option.live ? (live?.text ?? '') : recorded.text}
					</div></ScrollBox
				>
			{/if}

			<table class="data">
				<caption>
					Does a persona make it better at sums? “{d.persona}” vs. the default system prompt
				</caption>
				<thead>
					<tr>
						<th scope="col">Question</th>
						<th scope="col" class="num">Right answer</th>
						<th scope="col" class="num">Default</th>
						<th scope="col" class="num">Persona</th>
					</tr>
				</thead>
				<tbody>
					{#each d.math as m (m.question)}
						{@const both = option.live
							? [answers[`default|${m.question}`], answers[`persona|${m.question}`]]
							: [m.default, m.persona]}
						<tr>
							<th scope="row">{m.question.replace(' Reply with only the number.', '')}</th>
							<td>{m.expected}</td>
							{#each both as a, i (i)}
								{#if a}
									<td class:wrong={!a.correct}
										>{a.text}
										<span aria-hidden="true">{a.correct ? '✓' : '✗'}</span><span
											class="visually-hidden">{a.correct ? 'right' : 'wrong'}</span
										></td
									>
								{:else}
									<td class="pending">…<span class="visually-hidden">asking the model</span></td>
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
				<tfoot>
					{#if option.live}
						{@const asked = d.math.map((m) => [
							answers[`default|${m.question}`],
							answers[`persona|${m.question}`]
						])}
						<tr>
							<th scope="row">Right</th>
							<td></td>
							{#each [0, 1] as k (k)}
								<td
									>{asked.filter((a) => a[k]?.correct).length} of {asked.filter((a) => a[k])
										.length}</td
								>
							{/each}
						</tr>
					{:else}
						<tr>
							<th scope="row">Right</th>
							<td></td>
							<td>{d.math.filter((m) => m.default.correct).length} of {d.math.length}</td>
							<td>{d.math.filter((m) => m.persona.correct).length} of {d.math.length}</td>
						</tr>
					{/if}
				</tfoot>
			</table>
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Write your own system prompt and see how Qwen2.5-0.5B-Instruct's answer changes, live."
	/>
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
		min-width: 14rem;
		flex: 1;
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.template {
		margin: var(--space-1) 0 var(--space-3);
	}

	.reply {
		font-size: 0.9rem;
		white-space: pre-wrap;
	}

	table {
		margin-top: var(--space-4);
	}

	td.wrong {
		color: var(--c-loss-ink);
	}

	td.pending {
		color: var(--ink-muted);
	}

	tfoot th,
	tfoot td {
		font-weight: 700;
		border-bottom: 0;
	}
</style>
