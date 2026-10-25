<script lang="ts">
	import { all, useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import { search } from '#lib/harness/search.ts';

	const data = all([useDataset('agent/context'), useDataset('agent/search')]);
	let picked = $state(0);

	/** "Lily: Hey diddle diddle" from the exchange's opening message. */
	function name(text: string): string {
		const child = /^user: (\w+),/.exec(text)?.[1] ?? '';
		const rhyme = text.split('\n\n')[1]?.split(/[,;]/)[0] ?? '';
		return `${child}: ${rhyme}`;
	}

	const ordinal = (r: number) => ['1st', '2nd', '3rd'][r] ?? `${r + 1}th`;
</script>

{#snippet list(
	heading: string,
	kind: string,
	order: number[],
	about: number,
	names: string[],
	detail: (i: number) => string
)}
	<div class="list {kind}">
		<h3>{heading}</h3>
		{#if order.length === 0}
			<p class="none">No exchange has any of the question’s words.</p>
		{:else}
			<ol>
				{#each order as i, rank (i)}
					<li class:first={rank === 0} class:about={i === about}>
						<span class="name">{names[i]}</span>
						<span class="detail mono">{detail(i)}</span>
						{#if i === about}<span class="tag">✓ the one asked about</span>{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</div>
{/snippet}

<WidgetFrame
	title="Search by words or by meaning"
	source={{ kind: 'recorded', model: 'all-MiniLM-L6-v2' }}
	onreset={() => (picked = 0)}
>
	<Loading promise={data}>
		{#snippet children([context, recorded])}
			{@const q = recorded.questions[picked]}
			{@const texts = context.turns.map((t) => t.text)}
			{@const names = texts.map(name)}
			{@const r = search(
				q,
				texts,
				context.turns.map((t) => t.vector)
			)}
			<Choice
				legend="Question"
				appearance="select"
				options={recorded.questions.map((x, i) => ({ value: i, label: x.question }))}
				bind:value={picked}
			/>
			<div class="lists">
				{@render list('By words', 'words', r.keyword.order, q.about, names, (i) =>
					r.keyword.scores[i].toFixed(2)
				)}
				{@render list('By meaning', 'meaning', r.meaning.order, q.about, names, (i) =>
					r.meaning.scores[i].toFixed(3)
				)}
				{@render list('Both, combined by rank', 'both', r.both.order, q.about, names, (i) => {
					const w = r.keyword.order.indexOf(i);
					const m = r.meaning.order.indexOf(i);
					return `${w < 0 ? 'no words' : ordinal(w)} + ${ordinal(m)}`;
				})}
			</div>
			<Status>
				The top exchange goes back into the prompt. By words: <strong
					>{r.keyword.order.length ? names[r.keyword.order[0]] : 'nothing'}</strong
				>. By meaning: <strong>{names[r.meaning.order[0]]}</strong>. Combined:
				<strong>{names[r.both.order[0]]}</strong>.
			</Status>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.lists {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: var(--space-3);
	}

	.list {
		border-top: 3px solid var(--accent);
		padding-top: var(--space-1);
	}

	/* Words are token amber, meaning is vector teal, the combination neutral. */
	.words {
		--accent: var(--c-token);
		--tint: var(--c-token-tint);
	}

	.meaning {
		--accent: var(--c-vector);
		--tint: var(--c-vector-tint);
	}

	.both {
		--accent: var(--c-harness);
		--tint: var(--c-harness-tint);
	}

	h3 {
		margin: 0 0 var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.85rem;
	}

	ol {
		margin: 0;
		padding-left: 1.4rem;
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	li {
		padding: 2px var(--space-1);
	}

	li.first {
		background: var(--tint);
		font-weight: 600;
	}

	.name {
		margin-right: var(--space-1);
	}

	.detail {
		color: var(--ink-muted);
		font-weight: 400;
	}

	.tag {
		display: block;
		font-weight: 400;
		color: var(--ink-muted);
	}

	.none {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
		margin: 0;
	}
</style>
