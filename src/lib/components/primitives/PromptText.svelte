<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scrollable } from '#lib/components/ui/scrollable.ts';
	import { roleStyle, type Role } from './roles.ts';

	let {
		parts,
		label,
		maxHeight = '16rem',
		plain = false,
		emphasis = [],
		after
	}: {
		parts: readonly { text: string; kind: Role }[];
		label: string;
		maxHeight?: string;
		/** One color, as the model sees it. */
		plain?: boolean;
		/** Roles shown in bold. */
		emphasis?: readonly Role[];
		/** Content after the last part, such as a cursor. */
		after?: Snippet;
	} = $props();
</script>

<pre
	class="prompt"
	role="region"
	aria-label={label}
	style:max-height={maxHeight}
	{@attach scrollable}>{#each parts as p, i (i)}<span
			data-role={p.kind}
			class:strong={!plain && emphasis.includes(p.kind)}
			style={plain ? undefined : roleStyle(p.kind)}>{p.text}</span
		>{/each}{@render after?.()}</pre>

<style>
	.prompt {
		margin: 0;
		padding: var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		font-size: 0.8rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
		overflow: auto;
	}

	.strong {
		font-weight: 700;
	}
</style>
