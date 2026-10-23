<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import ChapterRef from '#lib/components/layout/ChapterRef.svelte';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { Router } from '#lib/math/router.ts';

	import { canonical } from '#lib/models/provider.ts';

	const EXPERTS = 8;
	const ROUTER_SEED = 2;
	const data = useDataset('vectors/the-cat-sat');
	const router = new Router(EXPERTS, canonical.embeddingSize, ROUTER_SEED);
	let k = $state(2);
	let picked = $state(1);
	const id = $props.id();
</script>

<WidgetFrame
	title="Send each token to a few experts"
	source={{ kind: 'computed' }}
	onreset={() => {
		k = 2;
		picked = 1;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const routes = d.tokenEmbeddings.map((v) => router.route(v, k))}
			{@const route = routes[picked]}
			<fieldset class="k">
				<legend class="label">Experts per token</legend>
				{#each [1, 2, 4, 8] as n (n)}
					<label><input type="radio" name="{id}-k" value={n} bind:group={k} /> {n}</label>
				{/each}
			</fieldset>

			<div class="scroll">
				<table>
					<caption class="visually-hidden">
						The router's score for each expert, for each token of “{d.prompt}”. Chosen experts are
						marked.
					</caption>
					<thead>
						<tr>
							<th scope="col">Token</th>
							{#each Array.from({ length: EXPERTS }, (_, e) => e) as e (e)}
								<th scope="col" class="num">Expert {e + 1}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each d.tokens as t, i (i)}
							<tr class:picked={i === picked}>
								<th scope="row">
									<button
										type="button"
										class="token mono"
										aria-pressed={i === picked}
										onclick={() => (picked = i)}>{displayToken(t.text)}</button
									>
								</th>
								{#each routes[i].probs as p, e (e)}
									{@const on = routes[i].chosen.includes(e)}
									<td class:on style:--p={p}>
										<span class="mono">{formatPercent(p)}</span>{#if on}<span class="tick"
												><span aria-hidden="true"> ✓</span><span class="visually-hidden">
													(chosen)</span
												></span
											>{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<p class="readout" aria-live="polite">
				<span class="mono">{displayToken(d.tokens[picked].text)}</span> goes to expert{route.chosen
					.length > 1
					? 's'
					: ''}
				{route.chosen
					.map((e) => e + 1)
					.join(', ')
					.replace(/, (\d+)$/, ' and $1')}{#if k > 1}, and its output mixes theirs {route.weights
						.map((w) => formatPercent(w))
						.join(' / ')}{/if}. Each token runs through {k} of {EXPERTS} experts, so it uses {Math.round(
					(k / EXPERTS) * 1000
				) / 10}% of the experts' weights.
			</p>
			<p class="note">
				Simplified: this router's weights are random rather than trained, and it reads each token's
				embedding from <ChapterRef to="embeddings" />. In a real model, the router in every block is
				trained along with the rest and reads the token's vector in the residual stream.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.k {
		border: 0;
		margin: 0 0 var(--space-3);
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.k legend {
		width: 100%;
		padding: 0;
	}

	.scroll {
		/* Positioned, so the visually hidden labels in the table can't widen the page. */
		position: relative;
		overflow-x: auto;
	}

	table {
		border-collapse: collapse;
		font-size: 0.8rem;
		width: 100%;
	}

	th,
	td {
		padding: 2px var(--space-1);
		border-bottom: 1px solid var(--rule);
		white-space: nowrap;
	}

	thead th {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--ink-muted);
	}

	th.num,
	td {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	tbody th {
		text-align: left;
	}

	td {
		background: color-mix(in oklch, var(--c-weight-tint) calc(var(--p) * 100%), transparent);
		color: var(--ink-muted);
	}

	td.on {
		background: var(--c-weight-tint);
		color: var(--ink);
		font-weight: 700;
		outline: 2px solid var(--c-weight);
		outline-offset: -2px;
	}

	.token {
		font: inherit;
		font-family: var(--font-mono);
		padding: 1px var(--space-2);
		border: 1px solid var(--c-token);
		border-radius: var(--radius);
		background: var(--c-token-tint);
		color: var(--ink);
		cursor: pointer;
	}

	tr.picked .token {
		outline: 2px solid var(--c-token-ink);
		font-weight: 700;
	}

	.readout {
		margin: var(--space-3) 0 0;
		min-height: 3em;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
