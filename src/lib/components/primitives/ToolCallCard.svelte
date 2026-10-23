<script lang="ts">
	import { simpleCall, type ToolCall } from '#lib/harness/tools.ts';

	let {
		call,
		result,
		blocked = false
	}: {
		call: ToolCall;
		result?: string;
		blocked?: boolean;
	} = $props();

	const RESULT_PREVIEW = 160;
	const short = $derived(
		result && result.length > RESULT_PREVIEW ? `${result.slice(0, RESULT_PREVIEW)}…` : result
	);
</script>

<div class="card" class:blocked>
	<p class="head">
		<span class="badge">tool call</span> <span class="mono name">{call.name}</span>
	</p>
	<p class="mono call">{simpleCall(call)}</p>
	{#if result !== undefined}
		<p class="result">
			<span class="badge">{blocked ? 'blocked by the harness' : 'result'}</span>
			<span class="mono" title={result}>{short}</span>
		</p>
	{/if}
</div>

<style>
	.card {
		border: 1.5px solid var(--c-harness);
		border-radius: var(--radius);
		background: var(--c-harness-tint);
		padding: var(--space-2) var(--space-3);
		font-size: 0.85rem;
	}

	.card.blocked {
		border-color: var(--c-loss);
	}

	p {
		margin: 0;
	}

	.head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.badge {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--c-harness-ink);
		font-weight: 600;
	}

	.blocked .result .badge {
		color: var(--c-loss-ink);
	}

	.name {
		font-weight: 600;
	}

	.call {
		margin: var(--space-1) 0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.result {
		border-top: 1px solid var(--rule);
		padding-top: var(--space-1);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.result .mono {
		display: block;
	}
</style>
