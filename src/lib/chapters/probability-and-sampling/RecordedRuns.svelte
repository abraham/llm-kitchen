<script lang="ts">
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { applyTemperature, sampleIndex } from '#lib/math/sampling.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';
	import { canonical, type Token } from '#lib/models/provider.ts';
	import { all, andThen, useDataset } from '#lib/datasets/use.ts';

	const TEMPERATURES = [0, 0.7, 1.5];
	const LABELS = ['0', '0.7', '1.5'];
	const TOP_K = 50;
	const runs = andThen(
		all([
			useDataset('traces/the-cat-sat-t00'),
			useDataset('traces/the-cat-sat-t07'),
			useDataset('traces/the-cat-sat-t15')
		]),
		(traces) => traces.map((trace, i) => ({ label: LABELS[i], trace }))
	);
	const option = useProvider('next-token', canonical.displayName);
	const id = $props.id();

	let draft = $state('');
	/** Live runs: the prompt and each temperature's continuation so far. */
	let live = $state<{ prompt: string; texts: string[]; done: boolean } | null>(null);
	let problem = $state('');
	let request = 0;

	/** Continues the prompt at each temperature, a token at a time, the three in turn. */
	async function run(prompt: string, length: number) {
		const provider = option.provider;
		if (!provider) return;
		const mine = ++request;
		problem = '';
		live = { prompt, texts: TEMPERATURES.map(() => ''), done: false };
		try {
			const start = await provider.tokenize(prompt);
			const contexts: Token[][] = TEMPERATURES.map(() => [...start]);
			for (let step = 0; step < length; step++) {
				for (const [i, temperature] of TEMPERATURES.entries()) {
					const d = await provider.nextTokenDistribution(contexts[i], { topK: TOP_K });
					if (mine !== request) return;
					const probs = d.candidates.map((c) => c.prob);
					const pick =
						temperature === 0
							? 0
							: sampleIndex(applyTemperature(probs, temperature), Math.random());
					contexts[i].push(d.candidates[pick].token);
					live.texts[i] += d.candidates[pick].token.text;
				}
			}
			live.done = true;
		} catch (error) {
			if (mine === request) problem = error instanceof Error ? error.message : String(error);
		}
	}

	// Going live runs the recorded prompt once, so the three columns show the model in this browser.
	$effect(() => {
		if (option.live) {
			void Promise.resolve(runs).then((list) =>
				run(list[0].trace.prompt, list[0].trace.steps.length)
			);
		} else request++;
	});
</script>

<WidgetFrame
	title="Same prompt, three temperatures"
	label={option.live ? 'Try it' : 'Recorded runs'}
	source={option.source}
	live={option}
	onreset={() => {
		draft = '';
		problem = '';
	}}
>
	<Loading promise={runs}>
		{#snippet children(list)}
			{@const length = list[0].trace.steps.length}
			{#if option.live}
				<form
					class="custom"
					onsubmit={(e) => {
						e.preventDefault();
						void run(draft.trimEnd() || list[0].trace.prompt, length);
					}}
				>
					<label class="label" for="{id}-prompt">Your own beginning</label>
					<input
						id="{id}-prompt"
						type="text"
						bind:value={draft}
						placeholder={list[0].trace.prompt}
						autocomplete="off"
					/>
					<button type="submit" disabled={live !== null && !live.done}>Run all three</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			<div class="runs" aria-live="polite" aria-busy={option.live && !live?.done}>
				{#each list as { label, trace }, i (label)}
					<figure>
						<figcaption class="label">Temperature {label}</figcaption>
						<p>
							{#if option.live && live}
								<strong>{live.prompt}</strong>{live.texts[i]}{live.done ? '…' : ''}
							{:else}
								<strong>{trace.prompt}</strong>{trace.steps.map((s) => s.chosen.text).join('')}…
							{/if}
						</p>
					</figure>
				{/each}
			</div>
			{#if option.live}
				<p class="note">
					Live runs sample among the {TOP_K} likeliest tokens at each step, with GPT-2 compressed to 8
					bits, so even temperature 0 can differ from the recording.
				</p>
			{/if}
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Run the three temperatures again, or on your own beginning, with {canonical.displayName} live."
	/>
</WidgetFrame>

<style>
	.custom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
	}

	.custom input {
		font: inherit;
		min-width: 14rem;
		flex: 1;
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.runs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
	}

	figure {
		margin: 0;
		padding: var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	p {
		margin: var(--space-2) 0 0;
		white-space: pre-wrap;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		white-space: normal;
	}
</style>
