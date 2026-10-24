<script lang="ts">
	import type { Snippet } from 'svelte';

	let { lines = 2, children }: { lines?: number; children?: Snippet } = $props();
</script>

<!-- Always rendered, so screen readers hear its first change; the reserved height keeps what's
     above from jumping as the text changes length. -->
<p class="status" role="status" style:--lines={lines}>{@render children?.()}</p>

<style>
	.status {
		margin: var(--space-3) 0 0;
		min-height: calc(var(--lines) * 1.5em);
	}
</style>
