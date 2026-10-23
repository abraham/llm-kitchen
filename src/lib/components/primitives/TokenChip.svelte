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
</script>

<span
	class="chip"
	data-state={state}
	role="img"
	aria-label={describeToken(token.text, showId ? token.id : undefined)}
>
	<span class="text">{displayToken(token.text)}</span>
	{#if showId}<span class="id">{token.id}</span>{/if}
</span>

<style>
	.chip {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 2px var(--space-2);
		border: 1.5px solid var(--c-token);
		border-radius: 999px;
		background: var(--c-token-tint);
		color: var(--c-token-ink);
		font-family: var(--font-mono);
		line-height: 1.2;
		vertical-align: middle;
		transition:
			opacity var(--duration) var(--ease),
			box-shadow var(--duration) var(--ease);
	}

	.text {
		font-size: 0.95rem;
		white-space: pre;
	}

	.id {
		font-size: 0.65rem;
		opacity: 0.85;
	}

	[data-state='new'] {
		box-shadow: 0 0 0 3px var(--c-token);
	}

	[data-state='muted'] {
		opacity: 0.55;
	}
</style>
