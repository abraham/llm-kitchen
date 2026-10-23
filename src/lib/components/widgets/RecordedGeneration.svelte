<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import { loadTrace } from '#lib/models/load-trace.ts';
	import GenerationStepper from './GenerationStepper.svelte';

	let {
		name,
		title,
		shown = 8,
		maxSteps
	}: { name: string; title?: string; shown?: number; maxSteps?: number } = $props();

	const trace = $derived(loadTrace(name));
</script>

<Loading promise={trace}>
	{#snippet children(t)}
		<GenerationStepper trace={t} {title} {shown} {maxSteps} />
	{/snippet}
</Loading>
