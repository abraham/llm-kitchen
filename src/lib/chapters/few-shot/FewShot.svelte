<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';

	type Model = 'qwen' | 'gpt2';
	type Row = { query: string; answer: string; runs: { shots: number; text: string; p?: number }[] };

	const data = useDataset('prompts/fewshot');
	const option = useProvider(['chat', 'next-token'], 'Qwen2.5-1.5B-Instruct and GPT-2 small');
	const id = $props.id();
	let task = $state(0);
	let model = $state<Model>('qwen');
	let shots = $state(4);
	/** The visitor's own words, by task; live only. */
	let extra = $state<Record<number, { query: string; answer: string }[]>>({});
	let query = $state('');
	let answer = $state('');
	/** Live chances, by model, prompt, and answer. */
	let scores = $state<Record<string, number>>({});
	let problem = $state('');

	const prompt = (examples: string[][], k: number, word: string) =>
		examples
			.slice(0, k)
			.map(([a, b]) => `${a} -> ${b}\n`)
			.join('') + `${word} ->`;
	const key = (m: Model, text: string, right: string) => `${m}|${text}|${right}`;

	async function score(m: Model, rows: Row[]) {
		const provider = option.providerFor(m === 'qwen' ? 'chat' : 'next-token');
		if (!provider?.score) return;
		for (const row of rows) {
			for (const run of row.runs) {
				const k = key(m, run.text, row.answer);
				if (k in scores) continue;
				scores[k] = await provider.score(run.text, ' ' + row.answer);
			}
		}
	}

	// Live, every chance in the table on show is the model's in this browser.
	$effect(() => {
		const which = task;
		const m = model;
		const mine = extra[which] ?? [];
		if (!option.live) return;
		void Promise.resolve(data)
			.then((d) => {
				problem = '';
				const t = d.tasks[which];
				const own = mine.map((w) => ({
					...w,
					runs: d.shots.map((k) => ({ shots: k, text: prompt(t.examples, k, w.query) }))
				}));
				return score(m, [...t.tests, ...own]);
			})
			.catch((error) => (problem = error instanceof Error ? error.message : String(error)));
	});
</script>

<WidgetFrame
	title="Learning from examples"
	source={option.source}
	live={option}
	onreset={() => {
		task = 0;
		model = 'qwen';
		shots = 4;
		extra = {};
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const t = d.tasks[task]}
			{@const first = t.tests[0].runs.find((r) => r.shots === shots)!}
			{@const own = (option.live ? (extra[task] ?? []) : []).map((w) => ({
				...w,
				runs: d.shots.map((k) => ({ shots: k, text: prompt(t.examples, k, w.query) }))
			}))}
			{@const rows: Row[] = [...t.tests, ...own].map((row) => ({
				...row,
				runs: row.runs.map((r) => ({
					shots: r.shots,
					text: r.text,
					p: option.live
						? scores[key(model, r.text, row.answer)]
						: (r as { gpt2?: number; qwen?: number })[model]
				}))
			}))}
			<div class="controls">
				<Choice
					legend="Task"
					options={d.tasks.map((t, i) => ({ value: i, label: t.name }))}
					bind:value={task}
				/>
				<Choice
					legend="Examples in the prompt"
					options={d.shots.map((n) => ({ value: n, label: String(n) }))}
					bind:value={shots}
				/>
				<Choice
					legend="Model"
					options={(['qwen', 'gpt2'] as const).map((m) => ({
						value: m,
						label: d.models[m].displayName
					}))}
					bind:value={model}
				/>
			</div>

			<p class="label">The prompt, for “{t.tests[0].query}”</p>
			<pre class="prompt">{first.text}<span class="gap" aria-hidden="true"> ___</span></pre>

			{#if option.live}
				<form
					class="own"
					onsubmit={(e) => {
						e.preventDefault();
						if (!query.trim() || !answer.trim()) return;
						extra[task] = [...(extra[task] ?? []), { query: query.trim(), answer: answer.trim() }];
						query = answer = '';
					}}
				>
					<label class="label" for="{id}-query">Your own word</label>
					<input id="{id}-query" type="text" bind:value={query} autocomplete="off" />
					<label class="label" for="{id}-answer">Its right answer</label>
					<input id="{id}-answer" type="text" bind:value={answer} autocomplete="off" />
					<button type="submit">Add a row</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

			<table class="data">
				<caption>
					Chance that {d.models[model].displayName} answers right, by number of examples
				</caption>
				<thead>
					<tr>
						<th scope="col">Word</th>
						<th scope="col">Right answer</th>
						{#each d.shots as n (n)}
							<th scope="col" class="num" class:on={n === shots}>{n} example{n === 1 ? '' : 's'}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i (i)}
						<tr>
							<th scope="row" class="mono">{row.query}</th>
							<td class="mono answer">{row.answer}</td>
							{#each row.runs as r (r.shots)}
								{#if r.p === undefined}
									<td class="pending" class:on={r.shots === shots}
										>…<span class="visually-hidden">asking the model</span></td
									>
								{:else}
									<td class="heat" class:on={r.shots === shots} style:--p={r.p}
										>{formatPercent(r.p)}</td
									>
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="note">
				No weights change between the columns: the only difference is how many examples sit in the
				prompt. With none, the model has no way to know what “->” is asking for.
			</p>
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Add your own word to the table, and Qwen2.5-0.5B-Instruct and GPT-2 score it live."
	/>
</WidgetFrame>

<style>
	.controls {
		--block-space: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		margin-bottom: var(--space-3);
	}

	.prompt {
		margin: var(--space-1) 0 var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		font-size: 0.85rem;
		white-space: pre-wrap;
	}

	.gap {
		color: var(--c-token-ink);
	}

	.own {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
	}

	.own input {
		font: inherit;
		width: 8rem;
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	td.answer {
		text-align: left;
		color: var(--ink-muted);
	}

	td.pending {
		color: var(--ink-muted);
	}

	th.on,
	td.on {
		font-weight: 700;
		outline: 2px solid var(--c-prob);
		outline-offset: -2px;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
