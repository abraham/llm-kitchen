<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import type { BaseVsInstruct, Column } from '#lib/datasets/parsers/prompts.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import type { GenerateInput } from '#lib/models/browser-model.svelte.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';
	import type { Token } from '#lib/models/provider.ts';

	type Out = { text: string; stopped: boolean; done: boolean };
	/** GPT-2's end-of-text token. */
	const END = 50256;

	const data = useDataset('chat/base-vs-instruct');
	const option = useProvider(['next-token', 'chat'], 'GPT-2 small and Qwen2.5-0.5B');
	const id = $props.id();
	let index = $state(0);
	let draft = $state('');
	/** The visitor's own prompt, once run; live only. */
	let own = $state('');
	/** Live outputs, by prompt and column. */
	let runs = $state<Record<string, Partial<Record<Column, Out>>>>({});
	let problem = $state('');

	const columns = (d: BaseVsInstruct): { key: Column; title: string; detail: string }[] => {
		const qwen = option.live
			? (option.providerFor('chat')?.model.spec.label ?? '')
			: d.models.instruct.displayName;
		return [
			{ key: 'gpt2', title: d.models.gpt2.displayName, detail: 'base model, 2019' },
			{ key: 'base', title: d.models.base.displayName, detail: 'base model' },
			{ key: 'instructNoTemplate', title: qwen, detail: 'tuned, but given the bare text' },
			{ key: 'instruct', title: qwen, detail: 'tuned, in its chat format' }
		];
	};

	/** GPT-2 continues the prompt greedily, a token at a time. */
	async function gpt2(prompt: string, max: number, out: Out) {
		const provider = option.providerFor('next-token');
		if (!provider) return;
		let context: Token[] = await provider.tokenize(prompt);
		for (let n = 0; n < max; n++) {
			const { candidates } = await provider.nextTokenDistribution(context, { topK: 1 });
			const next = candidates[0].token;
			if (next.id === END) {
				out.stopped = true;
				break;
			}
			context = [...context, next];
			out.text += next.text;
		}
	}

	async function run(prompt: string, max: number) {
		const chat = option.providerFor('chat');
		if (!chat?.reply || prompt in runs) return;
		runs[prompt] = {};
		const outs = runs[prompt];
		const column = (key: Column): Out => {
			outs[key] = { text: '', stopped: false, done: false };
			// Read back through the state proxy, so writing the text updates the page.
			return outs[key];
		};
		const g = column('gpt2');
		await gpt2(prompt, max, g);
		g.done = true;
		const inputs: [Column, GenerateInput][] = [
			['instructNoTemplate', { text: prompt }],
			['instruct', { messages: [{ role: 'user', content: prompt }] }]
		];
		for (const [key, input] of inputs) {
			const out = column(key);
			const r = await chat.reply(input, { maxTokens: max, ontext: (text) => (out.text = text) });
			Object.assign(out, { text: r.text, stopped: r.stopped, done: true });
		}
	}

	// Live, every prompt shown runs through the models in this browser.
	$effect(() => {
		const which = index;
		const mine = own;
		if (!option.live) return;
		void Promise.resolve(data)
			.then((d) => {
				problem = '';
				return run(mine || d.prompts[which].prompt, d.maxNewTokens);
			})
			.catch((error) => {
				problem = error instanceof Error ? error.message : String(error);
				delete runs[mine];
			});
	});
</script>

<WidgetFrame
	title="Same words, different models"
	source={option.source}
	live={option}
	onreset={() => {
		index = 0;
		draft = own = '';
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const prompt = (option.live && own) || d.prompts[index].prompt}
			{@const recorded = d.prompts.find((p) => p.prompt === prompt)}
			<Choice
				legend="Prompt"
				appearance="select"
				layout="inline"
				options={d.prompts.map((p, i) => ({ value: i, label: p.prompt }))}
				bind:value={() => index, (i) => ((index = i), (own = ''))}
			/>
			{#if option.live}
				<form
					class="own"
					onsubmit={(e) => {
						e.preventDefault();
						own = draft.trim();
					}}
				>
					<label class="label" for="{id}-own">Your own prompt</label>
					<input id="{id}-own" type="text" bind:value={draft} autocomplete="off" />
					<button type="submit">Run all three</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			<div class="grid">
				{#each columns(d) as c (c.key)}
					{@const live = option.live && c.key !== 'base'}
					{@const out = live ? runs[prompt]?.[c.key] : recorded?.[c.key]}
					<section class="col" class:chat={c.key === 'instruct'} aria-label="{c.title}, {c.detail}">
						<h4>{c.title}<span>{c.detail}</span></h4>
						{#if option.live && c.key === 'base'}
							<p class="end">
								The Large tier has no base Qwen, so this column stays recorded{recorded
									? '.'
									: ', and there is no recording for your prompt.'}
							</p>
						{/if}
						{#if out}
							<p class="out" aria-busy={live && !('done' in out && out.done)}>
								{#if c.key !== 'instruct'}<span class="prompt">{prompt}</span>{/if}{out.text}
							</p>
							{#if !live || ('done' in out && out.done)}
								<p class="end">
									{out.stopped ? 'Stopped by itself.' : `Cut off at ${d.maxNewTokens} tokens.`}
								</p>
							{/if}
						{:else if live}
							<p class="end">Waiting for the model…</p>
						{/if}
					</section>
				{/each}
			</div>
			<p class="note">
				Each model picks its most likely token every time, so these are repeatable. Shaded text is
				the prompt; the rest is what the model wrote.
			</p>
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Try your own prompt on GPT-2 and on Qwen2.5-0.5B-Instruct, with and without its chat format."
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: var(--space-3);
	}

	.col {
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
	}

	.col.chat {
		border-color: var(--c-vector);
	}

	h4 {
		margin: 0 0 var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	h4 span {
		display: block;
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--ink-muted);
	}

	.out {
		white-space: pre-wrap;
		font-size: 0.9rem;
		margin: 0;
	}

	.prompt {
		color: var(--ink-muted);
		background: color-mix(in oklch, var(--rule) 60%, transparent);
		border-radius: 3px;
		padding: 0 2px;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
	}

	.end {
		font-size: 0.75rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
