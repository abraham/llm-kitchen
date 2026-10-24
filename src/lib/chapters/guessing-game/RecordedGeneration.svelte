<script lang="ts">
	import Loading from '#lib/components/frame/Loading.svelte';
	import { useDatasets } from '#lib/datasets/use.ts';
	import type { TraceName } from '#lib/datasets/registry.ts';
	import GenerationStepper from './GenerationStepper.svelte';

	let {
		name,
		title,
		shown = 8,
		maxSteps
	}: { name: TraceName; title?: string; shown?: number; maxSteps?: number } = $props();

	const datasets = useDatasets();
	const trace = $derived(datasets(`traces/${name}`));
</script>

<Loading promise={trace}>
	{#snippet children(t)}
		<GenerationStepper trace={t} {title} {shown} {maxSteps} />
	{/snippet}
</Loading>
