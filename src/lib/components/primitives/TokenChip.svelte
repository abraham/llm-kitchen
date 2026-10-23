<script lang="ts">
	import type { Token } from '#lib/models/provider.ts';
	import { describeToken, displayToken } from './format.ts';

	let {
		token,
		showId = true,
		state = 'default'
	}: {
		token: Token;
		showId?: boolean;
		/** `new` marks a just-appended token; `muted` de-emphasizes it. */
		state?: 'default' | 'new' | 'muted';
	} = $props();

	const WHITESPACE = new Set(['·', '↵', '⇥']);
	const chars = $derived([...displayToken(token.text)]);
</script>

<span
	class="chip"
	data-state={state}
	role="img"
	aria-label={describeToken(token.text, showId ? token.id : undefined)}
>
	<span class="text"
		>{#each chars as c, i (i)}{#if WHITESPACE.has(c)}<span class="ws">{c}</span
				>{:else}{c}{/if}{/each}</span
	>
	{#if showId}<span class="id">{token.id}</span>{/if}
</span>

<style>
	.chip {
		display: inline-flex;
		flex-direction: column;
		min-width: 2.75rem;
		border: 1.5px solid var(--c-token);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface);
		color: var(--c-token-ink);
		font-family: var(--font-mono);
		line-height: 1.25;
		text-align: center;
		vertical-align: middle;
		transition:
			opacity var(--duration) var(--ease),
			box-shadow var(--duration) var(--ease);
	}

	.text {
		padding: 3px var(--space-2);
		background: var(--c-token-tint);
		font-size: 1rem;
		font-weight: 500;
		white-space: pre;
	}

	/* Space and newline markers: visible, but quieter than the letters. */
	.ws {
		color: var(--ink-muted);
		font-weight: 400;
	}

	.id {
		padding: 1px var(--space-2);
		border-top: 1px solid color-mix(in oklch, var(--c-token) 45%, transparent);
		font-size: 0.68rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}

	[data-state='new'] {
		box-shadow: 0 0 0 3px var(--c-token);
	}

	[data-state='muted'] {
		opacity: 0.55;
	}
</style>
