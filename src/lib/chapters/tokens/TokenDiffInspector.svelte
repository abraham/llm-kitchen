<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { describeToken, displayToken, formatCount } from '#lib/components/primitives/format.ts';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Status from '#lib/components/ui/Status.svelte';
	import {
		annotateTokens,
		describeTokenDiff,
		diffTokens,
		tokenKindLabel,
		type TokenDiffItem
	} from '#lib/math/token-diff.ts';
	import type { Token } from '#lib/models/provider.ts';
	import { TOKENIZERS, tokenize, type TokenizerName } from '#lib/models/tokenizers.ts';

	const PRESETS = [
		{ label: 'strawberry → ·strawberry', before: 'strawberry', after: ' strawberry' },
		{ label: 'cafe → café', before: 'cafe', after: 'café' },
		{ label: 'The cat → The 🐱', before: 'The cat', after: 'The 🐱' },
		{ label: 'return 0 → indented', before: 'return 0', after: '        return 0' }
	] as const;

	// Seed the starting GPT-2 preset so prerendered HTML shows the full diff before JS runs.
	const SEED_BEFORE: Token[] = [
		{ id: 301, text: 'st' },
		{ id: 1831, text: 'raw' },
		{ id: 8396, text: 'berry' }
	];
	const SEED_AFTER: Token[] = [{ id: 41236, text: ' strawberry' }];

	const id = $props.id();
	let tokenizer = $state<TokenizerName>('gpt2');
	let before = $state<string>(PRESETS[0].before);
	let after = $state<string>(PRESETS[0].after);
	let beforeTokens = $state<Token[]>(SEED_BEFORE);
	let afterTokens = $state<Token[]>(SEED_AFTER);
	let picked = $state<number | null>(null);

	$effect(() => {
		const name = tokenizer;
		const a = before.slice(0, 40);
		const b = after.slice(0, 40);
		if (name === 'gpt2' && a === PRESETS[0].before && b === PRESETS[0].after) {
			beforeTokens = SEED_BEFORE;
			afterTokens = SEED_AFTER;
			return;
		}
		let current = true;
		Promise.all([tokenize(name, a), tokenize(name, b)]).then(([bt, at]) => {
			if (!current) return;
			beforeTokens = bt;
			afterTokens = at;
		});
		return () => {
			current = false;
		};
	});

	const annotatedBefore = $derived(annotateTokens(beforeTokens));
	const annotatedAfter = $derived(annotateTokens(afterTokens));
	const items = $derived(diffTokens(annotatedBefore, annotatedAfter));

	const defaultIndex = $derived.by(() => {
		const added = items.findIndex((d) => d.kind === 'added');
		if (added >= 0) return added;
		const removed = items.findIndex((d) => d.kind === 'removed');
		return removed >= 0 ? removed : 0;
	});

	const selectedIndex = $derived(
		items.length === 0 ? -1 : picked !== null && picked < items.length ? picked : defaultIndex
	);
	const selected = $derived<TokenDiffItem | undefined>(
		selectedIndex >= 0 ? items[selectedIndex] : undefined
	);

	const removedCount = $derived(items.filter((d) => d.kind === 'removed').length);
	const addedCount = $derived(items.filter((d) => d.kind === 'added').length);
	const tokInfo = $derived(TOKENIZERS[tokenizer]);

	function choosePreset(p: (typeof PRESETS)[number]) {
		before = p.before;
		after = p.after;
		picked = null;
	}
</script>

<WidgetFrame
	title="Compare how text splits"
	source={{ kind: 'computed' }}
	onreset={() => {
		tokenizer = 'gpt2';
		choosePreset(PRESETS[0]);
	}}
>
	<div class="presets" role="group" aria-label="Examples">
		<span class="label">Examples</span>
		{#each PRESETS as p (p.label)}
			<button
				type="button"
				aria-pressed={before === p.before && after === p.after}
				onclick={() => choosePreset(p)}
			>
				{p.label}
			</button>
		{/each}
	</div>

	<div class="controls">
		<Choice
			legend="Tokenizer"
			layout="inline"
			options={Object.entries(TOKENIZERS).map(([value, t]) => ({
				value: value as TokenizerName,
				label: t.label
			}))}
			bind:value={
				() => tokenizer,
				(v) => {
					tokenizer = v;
					picked = null;
				}
			}
		/>
	</div>

	<div class="inputs">
		<label for="{id}-before">
			<span class="label">Before</span>
			<input
				id="{id}-before"
				bind:value={before}
				oninput={() => (picked = null)}
				maxlength="40"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
		<label for="{id}-after">
			<span class="label">After</span>
			<input
				id="{id}-after"
				bind:value={after}
				oninput={() => (picked = null)}
				maxlength="40"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
	</div>

	<div class="tally">
		<span class="mono">
			{annotatedBefore.length} → {annotatedAfter.length}
			{annotatedAfter.length === 1 ? 'token' : 'tokens'}
		</span>
		{#if removedCount === 0 && addedCount === 0}
			<span>No token changes.</span>
		{:else}
			<span>{removedCount} removed, {addedCount} added.</span>
		{/if}
	</div>

	{#if items.length > 0}
		<div class="strip" role="group" aria-label="Token diff, select any token to inspect it">
			{#each items as item, i (i)}
				<button
					type="button"
					class="tok {item.kind}"
					class:partial={item.token.partialUtf8}
					aria-pressed={i === selectedIndex}
					onclick={() => (picked = i)}
				>
					<span class="tag mono" aria-hidden="true">
						{item.kind === 'removed' ? '−' : item.kind === 'added' ? '+' : '·'}
					</span>
					<span class="text mono" aria-hidden="true">{displayToken(item.token.text)}</span>
					<span class="id mono" aria-hidden="true">{item.token.id}</span>
					<span class="visually-hidden">
						{describeToken(item.token.text, item.token.id)}, {item.kind === 'same'
							? 'unchanged'
							: item.kind}, position {item.token.index + 1}
					</span>
				</button>
			{/each}
		</div>

		<ul class="key" aria-label="Token key">
			<li><span class="swatch removed" aria-hidden="true">−</span> removed</li>
			<li><span class="swatch added" aria-hidden="true">+</span> added</li>
			<li><span class="swatch partial" aria-hidden="true"></span> split UTF-8 bytes</li>
		</ul>
	{/if}

	{#if selected}
		<dl class="detail" aria-label="Selected token details">
			<div>
				<dt class="label">Token</dt>
				<dd class="mono">
					<strong>{displayToken(selected.token.text)}</strong>
					<span class="muted">ID {formatCount(selected.token.id)}</span>
				</dd>
			</div>
			<div>
				<dt class="label">Position</dt>
				<dd>
					<span class="mono">#{selected.token.index + 1}</span>
					<span class="muted">
						({selected.kind === 'same' ? 'unchanged' : selected.kind} · {tokInfo.label})
					</span>
				</dd>
			</div>
			<div>
				<dt class="label">UTF-8 bytes</dt>
				<dd class="bytes mono">
					{#if selected.token.partialUtf8}
						<span>Split mid-character</span>
					{:else}
						{selected.token.utf8Hex.join(' ')}
						<span class="muted">({selected.token.utf8Hex.length})</span>
					{/if}
				</dd>
			</div>
			<div>
				<dt class="label">Shape</dt>
				<dd>{tokenKindLabel(selected.token)}</dd>
			</div>
		</dl>
	{/if}

	<Status lines={2}>
		{#if selected}
			{describeTokenDiff(selected, tokInfo.label)}
		{:else}
			Type in Before or After to compare how the tokenizer splits them.
		{/if}
	</Status>
</WidgetFrame>

<style>
	.presets {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.presets button[aria-pressed='true'] {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.controls {
		--block-space: var(--space-3);
	}

	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.inputs label {
		display: flex;
		flex-direction: column;
		flex: 1 1 10rem;
		min-width: 0;
	}

	input:not([type]) {
		font: inherit;
		font-family: var(--font-mono);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
		min-width: 0;
	}

	.tally {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: 0.9rem;
		color: var(--ink-muted);
		margin-bottom: var(--space-2);
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: var(--space-2);
	}

	.tok {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3rem;
		max-width: 100%;
		padding: var(--space-1) var(--space-2);
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
		color: var(--ink);
		line-height: 1.2;
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.tok.partial {
		border-style: dashed;
	}

	.tok.removed {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.tok.removed .text {
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.tok.added {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.tok[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.tag {
		font-size: 0.7rem;
	}

	.text {
		font-size: 0.95rem;
		font-weight: 600;
		white-space: pre;
		overflow-wrap: anywhere;
	}

	.id {
		font-size: 0.7rem;
	}

	.key {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.key li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.swatch {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.35rem;
		padding: 0 3px;
		border-radius: 3px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		border: 1.5px solid var(--rule);
	}

	.swatch.removed {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		text-decoration: line-through;
	}

	.swatch.added {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.swatch.partial {
		border-style: dashed;
		background: var(--surface-2);
		color: var(--ink);
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
		overflow-wrap: anywhere;
	}

	.muted {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.bytes {
		font-size: 0.85rem;
	}
</style>
