<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { loadJson, type TokenVectors } from '#lib/models/load-json.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = loadJson<TokenVectors>(`vectors/${canonical.id}/the-cat-sat.json`);
	let stage = $state(canonical.layers);
	const id = $props.id();

	const stageName = (i: number) =>
		i === 0
			? 'at the start (word + position)'
			: i === canonical.layers
				? `after block ${i} (the end)`
				: `after block ${i}`;

	/** Color scale: the 95th-percentile size, so a few huge numbers don't wash out the rest. */
	function typical(values: number[]): number {
		const sizes = values.map(Math.abs).sort((a, b) => a - b);
		return sizes[Math.floor(sizes.length * 0.95)];
	}
</script>

<WidgetFrame
	title="Watch the guess form"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => (stage = canonical.layers)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const last = d.tokens.at(-1)!}
			<p class="prompt">
				“{d.prompt}<span class="blank">___</span>”: the stream for the last token,
				<span class="mono">{displayToken(last.text)}</span>, block by block.
			</p>
			<div class="slider">
				<label for="{id}-stage" class="label"
					>Read the stream <strong>{stageName(stage)}</strong></label
				>
				<input id="{id}-stage" type="range" min="0" max={canonical.layers} bind:value={stage} />
			</div>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="scroll" tabindex="0" role="region" aria-label="Stream at each stage">
				<table>
					<caption class="visually-hidden">Top guesses if the model stopped at each stage</caption>
					<thead>
						<tr
							><th scope="col">Stage</th><th scope="col"
								>Stream (first 48 of {d.dimensions} numbers)</th
							><th scope="col">Top guesses if it stopped here</th></tr
						>
					</thead>
					<tbody>
						{#each d.logitLens as guesses, i (i)}
							<tr class:current={i === stage} class:later={i > stage}>
								<th scope="row">{i === 0 ? 'start' : `block ${i}`}</th>
								<td
									><VectorStrip
										values={d.lastTokenByLayer[i]}
										scale={typical(d.lastTokenByLayer[i])}
										label="Stream {stageName(i)}"
									/></td
								>
								<td>
									{#each guesses.slice(0, 3) as g (g.token.id)}
										<span class="guess"
											><span class="mono">{displayToken(g.token.text)}</span>
											{formatPercent(g.prob)}</span
										>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="readout" aria-live="polite">
				Read {stageName(stage)}, the best guess is
				<strong class="mono">{displayToken(d.logitLens[stage][0].token.text)}</strong>
				({formatPercent(d.logitLens[stage][0].prob)}).
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.prompt {
		margin-top: 0;
	}

	.blank {
		color: var(--ink-muted);
	}

	.slider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-3);
	}

	input[type='range'] {
		accent-color: var(--c-vector);
		min-width: 12rem;
	}

	table {
		border-collapse: collapse;
		font-size: 0.85rem;
		width: 100%;
	}

	th,
	td {
		padding: 2px var(--space-2);
		text-align: left;
		border-bottom: 1px solid var(--rule);
		white-space: nowrap;
	}

	thead th {
		font-family: var(--font-sans);
		font-weight: 600;
		color: var(--ink-muted);
		font-size: 0.75rem;
	}

	tbody th {
		font-weight: 400;
	}

	tr.current {
		background: var(--c-vector-tint);
	}

	tr.current th {
		font-weight: 700;
	}

	tr.later {
		opacity: 0.45;
	}

	.guess {
		display: inline-block;
		min-width: 9.5em;
	}

	.scroll {
		overflow-x: auto;
	}

	.readout {
		margin: var(--space-3) 0 0;
	}
</style>
