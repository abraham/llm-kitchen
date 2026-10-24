<script lang="ts">
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { formatPercent, formatSigned } from '#lib/components/primitives/format.ts';
	import { TOY_ATTENTION, attend } from '#lib/math/attention.ts';

	const { tokens, queries, keys, values } = TOY_ATTENTION;
	const result = attend(TOY_ATTENTION);
	const Q = tokens.length - 1; // "it"
	const stepper = new Stepper(4);
	const vec = (v: number[]) => `[${v.map((x) => formatSigned(x)).join(', ')}]`;

	const STEPS = [
		'Spotlight: “it” shines a light back on the earlier words (and itself). How brightly each one is lit decides how much of it gets mixed in.',
		'Scores: every word has a query (what it is looking for) and a key (what it offers). Multiply them to score each pair; a word can’t look ahead, so later words are blank.',
		'Softmax: each row of scores becomes percentages that add up to 100%. These are the attention weights.',
		'Mix: each word also has a value (what it passes on). “it” gets a weighted blend of the values, mostly from “trophy”.'
	];
</script>

<WidgetFrame
	title="Queries, keys, and values"
	label="Step through"
	source={{ kind: 'sample' }}
	onreset={() => stepper.reset()}
>
	{#if stepper.index === 0}
		<div class="spotlight" aria-label="Words lit by how much “it” attends to them">
			{#each tokens as t, k (k)}
				<span class="word" class:query={k === Q} style:--light={result.weights[Q][k]}>
					{t}
					<span class="pct">{formatPercent(result.weights[Q][k])}{k === Q ? ' (itself)' : ''}</span>
				</span>
			{/each}
		</div>
	{:else if stepper.index < 3}
		<table class="grid">
			<caption class="visually-hidden"
				>{stepper.index === 1
					? 'Scores: query times key'
					: 'Attention weights after softmax'}</caption
			>
			<thead>
				<tr>
					<th scope="col"><span class="visually-hidden">Looking word</span></th>
					{#each tokens as t, k (k)}<th scope="col"
							>{t}<span class="vec mono">key {vec(keys[k])}</span></th
						>{/each}
				</tr>
			</thead>
			<tbody>
				{#each tokens as t, q (q)}
					<tr class:focus={q === Q}>
						<th scope="row">{t}<span class="vec mono">query {vec(queries[q])}</span></th>
						{#each result.scores[q] as s, k (k)}
							<td
								class="mono"
								class:masked={s === null}
								style:--light={stepper.index === 2 ? result.weights[q][k] : 0}
							>
								{s === null
									? '—'
									: stepper.index === 1
										? formatSigned(s)
										: formatPercent(result.weights[q][k])}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<ol class="mix">
			{#each tokens as t, k (k)}
				<li>
					<span class="mono w">{formatPercent(result.weights[Q][k])} ×</span>
					<span class="name">{t}</span>
					<VectorStrip values={values[k]} cells={3} label="Value of {t}" />
					<span class="mono">{vec(values[k])}</span>
				</li>
			{/each}
			<li class="sum">
				<span class="mono w">=</span>
				<span class="name">new “it”</span>
				<VectorStrip values={result.outputs[Q]} cells={3} label="Blended value for it" />
				<span class="mono">{vec(result.outputs[Q])}</span>
			</li>
		</ol>
	{/if}
	<p class="explain">{STEPS[stepper.index]}</p>
	<p class="note">
		Made-up 2- and 3-number vectors so the arithmetic is readable. GPT-2 small uses 64 numbers per
		head, 12 heads per layer.
	</p>

	{#snippet controls()}
		<StepController {stepper} describe={(i) => STEPS[i]} />
	{/snippet}
</WidgetFrame>

<style>
	.spotlight {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-size: 1.3rem;
		padding: var(--space-4) 0;
	}

	.word {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: color-mix(
			in oklch,
			var(--c-attention-tint) calc(var(--light) * 100%),
			var(--surface)
		);
		border: 1.5px solid
			color-mix(in oklch, var(--c-attention) calc(var(--light) * 100%), var(--rule));
	}

	.word.query {
		border: 2px dashed var(--c-attention);
		background: var(--surface);
	}

	.pct {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--c-attention-ink);
	}

	.grid {
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.grid th,
	.grid td {
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		text-align: center;
	}

	.grid th {
		font-weight: 600;
	}

	.vec {
		display: block;
		font-size: 0.65rem;
		font-weight: 400;
		color: var(--ink-muted);
	}

	.grid td {
		background: color-mix(
			in oklch,
			var(--c-attention-tint) calc(var(--light) * 100%),
			var(--surface)
		);
	}

	.grid td.masked {
		color: var(--ink-muted);
		background: var(--surface-2);
	}

	.grid tr.focus th[scope='row'] {
		color: var(--c-attention-ink);
	}

	.mix {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-2);
	}

	.mix li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.mix .sum {
		border-top: 1px solid var(--rule);
		padding-top: var(--space-2);
		font-weight: 600;
	}

	.w {
		min-width: 4.5em;
		text-align: right;
		color: var(--c-attention-ink);
	}

	.name {
		min-width: 6em;
	}

	.explain {
		min-height: 3.2em;
		margin: var(--space-4) 0 0;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
