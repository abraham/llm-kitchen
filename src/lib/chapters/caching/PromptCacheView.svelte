<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';

	import {
		CACHE_BUDGET,
		CACHE_EDITS,
		CACHED_PRICE,
		annotateCacheCalls,
		cacheCalls,
		cacheTotals,
		describeCacheBlock,
		type AnnotatedCacheBlock,
		type CacheBlockStatus,
		type CacheEdit
	} from '#lib/harness/cache.ts';
	import { formatCount } from '#lib/components/primitives/format.ts';

	const data = useDataset('agent/context');
	let edit = $state<CacheEdit>('append');
	let picked = $state<{ call: number; block: number } | null>(null);

	const STATUS_LABEL: Record<CacheBlockStatus, string> = {
		cached: 'Read from cache',
		break: 'Broke the cache',
		invalidated: 'Recomputed (after break)',
		new: 'New (processed from scratch)'
	};

	function defaultSelection(rows: AnnotatedCacheBlock[][]): { call: number; block: number } {
		for (const row of rows) {
			const hit = row.find((b) => b.status === 'break');
			if (hit) return { call: hit.callIndex, block: hit.blockIndex };
		}
		const lastRow = rows.at(-1);
		if (lastRow && lastRow.length > 0) {
			return { call: rows.length - 1, block: lastRow.length - 1 };
		}
		return { call: 0, block: 0 };
	}

	function resolveSelection(rows: AnnotatedCacheBlock[][]): AnnotatedCacheBlock | undefined {
		if (picked) {
			const hit = rows[picked.call]?.[picked.block];
			if (hit) return hit;
		}
		const fallback = defaultSelection(rows);
		return rows[fallback.call]?.[fallback.block];
	}
</script>

<WidgetFrame
	title="What the provider can reuse"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => {
		edit = 'append';
		picked = null;
	}}
>
	<Loading promise={data}>
		{#snippet children(s)}
			{@const calls = cacheCalls(s, edit)}
			{@const rows = annotateCacheCalls(calls)}
			{@const totals = cacheTotals(calls)}
			{@const widest = Math.max(...cacheCalls(s, 'append').map((c) => c.tokens))}
			{@const selected = resolveSelection(rows)}
			<p class="intro">
				The <ChapterRef to="managing-the-context" /> session: six turns of chat, then you ask a question.
				Each row is the prompt the harness sends, drawn to scale. Select any block to see whether it was
				reused from the cache or forced later blocks to be recomputed.
			</p>

			<Choice
				legend="What the harness does"
				options={Object.entries(CACHE_EDITS).map(([value, label]) => ({ value, label }))}
				bind:value={
					() => edit,
					(v) => {
						edit = v;
						picked = null;
					}
				}
			/>

			<ol class="calls" aria-label="Prompts sent, one per call">
				{#each calls as c, i (i)}
					<li>
						<span class="name">{c.label}</span>
						<span class="row" style:--w="{(c.tokens / widest) * 100}%">
							{#each rows[i] as item (item.block.key)}
								{@const active =
									selected?.callIndex === item.callIndex &&
									selected?.blockIndex === item.blockIndex}
								<button
									type="button"
									class="block {item.block.kind} {item.status}"
									style:--tokens={item.block.tokens}
									aria-pressed={active}
									onclick={() => (picked = { call: item.callIndex, block: item.blockIndex })}
								>
									<span class="visually-hidden">
										{item.callLabel}, {item.block.label}, {formatCount(item.block.tokens)} tokens, {STATUS_LABEL[
											item.status
										]}
									</span>
								</button>
							{/each}
						</span>
						<span class="num">{formatCount(c.cached)} of {formatCount(c.tokens)} cached</span>
					</li>
				{/each}
			</ol>
			<ul class="legend" aria-label="Block key">
				<li><span class="swatch cached" aria-hidden="true"></span>read from the cache</li>
				<li><span class="swatch break" aria-hidden="true"></span>broke the prefix</li>
				<li><span class="swatch invalidated" aria-hidden="true"></span>recomputed after break</li>
				<li><span class="swatch new" aria-hidden="true"></span>new</li>
				<li><span class="swatch summary" aria-hidden="true"></span>summary note</li>
			</ul>

			{#if selected}
				<dl class="detail" aria-label="Selected block details">
					<div>
						<dt class="label">Call &amp; block</dt>
						<dd>
							<strong>{selected.callLabel}</strong>
							<span class="muted">· {selected.block.label}</span>
						</dd>
					</div>
					<div>
						<dt class="label">Status</dt>
						<dd class="status-cell {selected.status}">{STATUS_LABEL[selected.status]}</dd>
					</div>
					<div>
						<dt class="label">Change at this slot</dt>
						<dd class="diff">
							{#if selected.status === 'break' && selected.replacedLabel}
								<span class="old">{selected.replacedLabel}</span>
								<span aria-hidden="true">→</span>
								<span class="added">{selected.block.label}</span>
							{:else if selected.status === 'cached'}
								<span>Matched {selected.comparedTo}</span>
							{:else if selected.status === 'invalidated'}
								<span>Unchanged text, shifted/invalidated</span>
							{:else}
								<span>Appended at offset {formatCount(selected.startToken)}</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt class="label">Tokens</dt>
						<dd class="mono">
							<strong>{formatCount(selected.block.tokens)}</strong>
							{#if selected.status === 'break'}
								<span class="muted">
									({formatCount(selected.recomputedTokens)} recomputed from here)
								</span>
							{:else}
								<span class="muted">at offset {formatCount(selected.startToken)}</span>
							{/if}
						</dd>
					</div>
				</dl>
			{/if}

			<Status lines={2}>
				{#if selected}
					{describeCacheBlock(selected)}
				{/if}
			</Status>

			<dl class="totals">
				<div>
					<dt>Tokens sent</dt>
					<dd>{formatCount(totals.sent)}</dd>
				</div>
				<div>
					<dt>Read from the cache</dt>
					<dd>{formatCount(totals.cached)} ({Math.round((totals.cached / totals.sent) * 100)}%)</dd>
				</div>
				<div>
					<dt>Processed from scratch</dt>
					<dd>{formatCount(totals.processed)}</dd>
				</div>
				<div>
					<dt>Input cost, in full-price tokens</dt>
					<dd>{formatCount(totals.cost)}</dd>
				</div>
			</dl>
			<p class="note">
				Simplified: cached tokens are priced at {CACHED_PRICE * 100}% of normal, about what
				providers charge, and the budget for dropping or summarizing is a small {formatCount(
					CACHE_BUDGET
				)} tokens so it comes into play. Real providers also charge a little extra to write the cache
				and only cache prompts above a minimum length.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.intro {
		margin-top: 0;
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
		gap: 2px;
		min-height: 24px;
		width: max(var(--w), fit-content);
		max-width: 100%;
	}

	.block {
		flex: var(--tokens) 1 0;
		min-width: 24px;
		min-height: 24px;
		padding: 0;
		border-radius: 3px;
		border: 1.5px solid var(--c-token);
		background: var(--c-token);
		transition:
			transform var(--duration) var(--ease),
			outline-color var(--duration) var(--ease);
	}

	.block.cached {
		background: var(--c-vector-tint);
		border-color: var(--c-vector);
	}

	.block.break {
		background: var(--c-loss-tint);
		border-color: var(--c-loss);
		background-image: repeating-linear-gradient(-45deg, transparent 0 4px, var(--c-loss) 4px 5px);
	}

	.block.invalidated {
		background: var(--c-token-tint);
		border-color: var(--c-token);
		border-style: dashed;
	}

	.block.summary {
		background: var(--c-weight-tint);
		border-color: var(--c-weight);
	}

	.block.summary.break {
		background-image: repeating-linear-gradient(-45deg, transparent 0 4px, var(--c-loss) 4px 5px);
		border-color: var(--c-loss);
	}

	.block[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.num {
		grid-column: 2;
		color: var(--ink-muted);
	}

	@media (max-width: 36rem) {
		.calls li {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}

		.num {
			grid-column: 1;
		}
	}

	.legend {
		list-style: none;
		padding: 0;
		margin: var(--space-2) 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.swatch {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 2px;
		border: 1.5px solid var(--c-token);
		background: var(--c-token);
	}

	.swatch.cached {
		background: var(--c-vector-tint);
		border-color: var(--c-vector);
	}

	.swatch.break {
		background: var(--c-loss-tint);
		border-color: var(--c-loss);
		background-image: repeating-linear-gradient(-45deg, transparent 0 3px, var(--c-loss) 3px 4px);
	}

	.swatch.invalidated {
		background: var(--c-token-tint);
		border-color: var(--c-token);
		border-style: dashed;
	}

	.swatch.summary {
		background: var(--c-weight-tint);
		border-color: var(--c-weight);
	}

	.detail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.detail dt {
		margin-bottom: 2px;
	}

	.detail dd {
		margin: 0;
		font-size: 0.95rem;
	}

	.muted {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.status-cell.break {
		color: var(--c-loss-ink);
		font-weight: 600;
	}

	.status-cell.cached {
		color: var(--c-vector-ink);
		font-weight: 600;
	}

	.diff {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.old {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		text-decoration: line-through;
		font-size: 0.85rem;
	}

	.added {
		padding: 0 var(--space-1);
		border-radius: 3px;
		border: 1px solid var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
		font-size: 0.85rem;
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
