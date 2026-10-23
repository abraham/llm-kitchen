<script module lang="ts">
	export interface Bar {
		label: string;
		p: number;
		highlight?: boolean;
	}
</script>

<script lang="ts">
	import { displayToken, formatPercent } from './format.ts';

	let {
		bars,
		caption,
		scaleTo = 'max'
	}: {
		bars: Bar[];
		caption: string;
		/** Scale bar widths to the largest bar, or to 100%. */
		scaleTo?: 'max' | 'one';
	} = $props();

	const scale = $derived(scaleTo === 'one' ? 1 : Math.max(...bars.map((b) => b.p), 1e-9));
</script>

<table class="prob-bars">
	<caption class="visually-hidden">{caption}</caption>
	<thead class="visually-hidden">
		<tr><th scope="col">Next token</th><th scope="col">Probability</th></tr>
	</thead>
	<tbody>
		{#each bars as bar (bar.label)}
			<tr class:highlight={bar.highlight}>
				<th scope="row" class="label">{displayToken(bar.label)}</th>
				<td>
					<span class="cell">
						<span class="track" aria-hidden="true">
							<span class="bar" style:width="{(bar.p / scale) * 100}%"></span>
						</span>
						<span class="value">{formatPercent(bar.p)}</span>
					</span>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.prob-bars {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	th.label {
		text-align: right;
		font-weight: 400;
		padding: 2px var(--space-2) 2px 0;
		white-space: pre;
		width: 1%;
		color: var(--ink);
	}

	td {
		padding: 2px 0;
	}

	.cell {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.track {
		flex: 1;
		height: 1.1rem;
		background: var(--surface-2);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar {
		display: block;
		height: 100%;
		background: var(--c-prob);
		transition: width var(--duration) var(--ease);
	}

	.value {
		min-width: 3.5em;
		text-align: right;
		color: var(--c-prob-ink);
	}

	.highlight th.label {
		font-weight: 700;
	}

	.highlight .track {
		outline: 2px solid var(--c-prob-ink);
		outline-offset: 1px;
	}
</style>
