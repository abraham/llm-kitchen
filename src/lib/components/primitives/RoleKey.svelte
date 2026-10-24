<script lang="ts">
	import { roleSwatch, type Role } from './roles.ts';

	let { roles }: { roles: readonly { kind: Role; label: string; off?: boolean }[] } = $props();
</script>

<ul class="key" aria-label="Colors">
	{#each roles as r (r.kind)}
		<li class:off={r.off}>
			<span class="swatch" style={r.off ? undefined : roleSwatch(r.kind)}></span>{r.label}
		</li>
	{/each}
</ul>

<style>
	.key {
		list-style: none;
		padding: 0;
		margin: var(--space-2) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.off .swatch {
		background: var(--rule);
	}

	.swatch {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
	}
</style>
