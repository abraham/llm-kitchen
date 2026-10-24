<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Citations, setCitations } from '#lib/citations.svelte.ts';
	import Sources from './Sources.svelte';

	let { children }: { children: Snippet } = $props();

	const citations = new Citations();
	setCitations(citations);
</script>

{@render children()}
<Sources {citations} />
