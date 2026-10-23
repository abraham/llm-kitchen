<script lang="ts">
	import { crossfade } from 'svelte/transition';
	import Loading from '#lib/components/layout/Loading.svelte';
	import StepController from '#lib/components/layout/StepController.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/layout/stepper.svelte.ts';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { displayToken } from '#lib/components/primitives/format.ts';
	import { loadJson, type TokenVectors } from '#lib/models/load-json.ts';
	import { canonical } from '#lib/models/provider.ts';
	import { motion } from '#lib/stores/motion-prefs.svelte.ts';

	const data = loadJson<TokenVectors>(`vectors/${canonical.id}/the-cat-sat.json`);
	const stepper = new Stepper(2);
	const [send, receive] = crossfade({ duration: () => motion.duration(450) });

	const describe = (i: number) =>
		i === 0
			? 'Five tokens, each with an ID number.'
			: `Each token ID picks out its own list of ${canonical.embeddingSize} numbers.`;
</script>

<WidgetFrame
	title="From token to vector"
	label="Step through"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => stepper.reset()}
>
	<Loading promise={data}>
		{#snippet children(d)}
			<ol class="rows">
				{#each d.tokens as token, i (i)}
					<li>
						{#if stepper.index === 0}
							<span in:receive={{ key: i }} out:send={{ key: i }}><TokenChip {token} /></span>
						{:else}
							<span class="vector-row" in:receive={{ key: i }} out:send={{ key: i }}>
								<span class="mono word">{displayToken(token.text)}</span>
								<VectorStrip values={d.tokenEmbeddings[i]} label="Vector for {token.text.trim()}" />
							</span>
						{/if}
					</li>
				{/each}
			</ol>
			<p class="explain">{describe(stepper.index)}</p>
		{/snippet}
	</Loading>

	{#snippet controls()}
		<StepController {stepper} {describe} />
	{/snippet}
</WidgetFrame>

<style>
	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-2);
		min-height: 11rem;
	}

	.vector-row {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.word {
		min-width: 3.5rem;
		text-align: right;
		color: var(--c-token-ink);
	}

	.explain {
		margin: var(--space-4) 0 0;
	}
</style>
