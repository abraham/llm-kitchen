<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import type { ContextSession } from '#lib/harness/agent.ts';
	import {
		CACHE_BUDGET,
		CACHE_EDITS,
		CACHED_PRICE,
		cacheCalls,
		cacheTotals,
		type CacheEdit
	} from '#lib/harness/cache.ts';
	import { loadJson } from '#lib/models/load-json.ts';

	const data = loadJson<ContextSession>('agent/context.json');
	let edit = $state<CacheEdit>('append');
	const id = $props.id();
	const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
</script>

<WidgetFrame
	title="What the provider can reuse"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (edit = 'append')}
>
	<Loading promise={data}>
		{#snippet children(s)}
			{@const calls = cacheCalls(s, edit)}
			{@const totals = cacheTotals(calls)}
			{@const widest = Math.max(...cacheCalls(s, 'append').map((c) => c.tokens))}
			<p class="intro">
				The Ch 26 session: the agent does six tasks, then you ask a question. Each row is the prompt
				the harness sends, drawn to scale. The shaded start of each row matches an earlier prompt
				exactly, so it can be read from the cache.
			</p>

			<fieldset class="pick">
				<legend class="label">What the harness does</legend>
				{#each Object.entries(CACHE_EDITS) as [key, label] (key)}
					<label><input type="radio" name="{id}-e" bind:group={edit} value={key} /> {label}</label>
				{/each}
			</fieldset>

			<ol class="calls" aria-label="Prompts sent, one per call">
				{#each calls as c, i (i)}
					<li>
						<span class="name">{c.label}</span>
						<span class="row" style:width="{(c.tokens / widest) * 100}%">
							{#each c.blocks as b (b.key)}
								{@const start = c.blocks
									.slice(0, c.blocks.indexOf(b))
									.reduce((a, x) => a + x.tokens, 0)}
								<span
									class="block {b.kind}"
									class:cached={start + b.tokens <= c.cached}
									style:flex-grow={b.tokens}
									title="{b.label}: {fmt(b.tokens)} tokens"
								></span>
							{/each}
						</span>
						<span class="num">{fmt(c.cached)} of {fmt(c.tokens)} cached</span>
					</li>
				{/each}
			</ol>
			<ul class="legend" aria-hidden="true">
				<li><span class="swatch cached"></span>read from the cache</li>
				<li><span class="swatch"></span>processed from scratch</li>
				<li><span class="swatch summary"></span>summary note</li>
			</ul>

			<dl class="totals" aria-live="polite">
				<div>
					<dt>Tokens sent</dt>
					<dd>{fmt(totals.sent)}</dd>
				</div>
				<div>
					<dt>Read from the cache</dt>
					<dd>{fmt(totals.cached)} ({Math.round((totals.cached / totals.sent) * 100)}%)</dd>
				</div>
				<div>
					<dt>Processed from scratch</dt>
					<dd>{fmt(totals.processed)}</dd>
				</div>
				<div>
					<dt>Input cost, in full-price tokens</dt>
					<dd>{fmt(totals.cost)}</dd>
				</div>
			</dl>
			<p class="note">
				Simplified: cached tokens are priced at {CACHED_PRICE * 100}% of normal, about what
				providers charge, and the budget for dropping or summarizing is a small {fmt(CACHE_BUDGET)} tokens
				so it comes into play. Real providers also charge a little extra to write the cache and only cache
				prompts above a minimum length.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.intro {
		margin-top: 0;
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

	.calls {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.calls li {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0 var(--space-2);
	}

	.row {
		display: flex;
		gap: 1px;
		height: 1.1rem;
	}

	.block {
		background: var(--c-token);
		border-radius: 2px;
	}

	.block.summary {
		background: var(--c-weight);
	}

	.block.cached {
		background: var(--c-vector-tint);
		box-shadow: inset 0 0 0 1px var(--c-vector);
	}

	.num {
		grid-column: 2;
		color: var(--ink-muted);
	}

	.legend {
		list-style: none;
		padding: 0;
		margin: var(--space-2) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.swatch {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
		background: var(--c-token);
	}

	.swatch.cached {
		background: var(--c-vector-tint);
		box-shadow: inset 0 0 0 1px var(--c-vector);
	}

	.swatch.summary {
		background: var(--c-weight);
	}

	.totals {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
	}

	.totals div {
		padding: var(--space-2);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.totals dt {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--ink-muted);
	}

	.totals dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 1.1rem;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
