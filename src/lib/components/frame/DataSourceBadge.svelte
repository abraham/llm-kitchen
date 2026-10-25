<script lang="ts">
	import { describeSource, type DataSource } from './data-source.ts';

	let { source }: { source: DataSource } = $props();
</script>

<span class="badge" data-kind={source.kind}>
	<span class="dot" aria-hidden="true"></span>
	{describeSource(source)}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--ink-muted);
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0 var(--space-2);
		/* Short badges stay on one line; a long live one wraps instead of widening a phone's page. */
		max-width: 100%;
		text-wrap: balance;
	}

	.dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		border: 1.5px solid currentColor;
	}

	[data-kind='live'] {
		color: var(--c-prob-ink);
		border-color: currentColor;
	}

	[data-kind='live'] .dot {
		background: currentColor;
	}
</style>
