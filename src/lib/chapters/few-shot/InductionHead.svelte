<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = useDataset('prompts/fewshot');
	const id = $props.id();
	let task = $state(0);
	// Lines are shown one per row, so each line's tokens are grouped.
	function lines(tokens: { text: string }[], attention: number[]) {
		const out: { text: string; a: number }[][] = [[]];
		tokens.forEach((t, i) => {
			const parts = t.text.split('\n');
			parts.forEach((p, j) => {
				if (j > 0) out.push([]);
				if (p) out.at(-1)!.push({ text: p, a: attention[i] });
			});
		});
		return out;
	}
</script>

<WidgetFrame
	title="Where the arrow looks"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => (task = 0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const t = d.tasks[task]}
			{@const peak = Math.max(...t.head.attention)}
			<fieldset>
				<legend class="label">Task</legend>
				{#each d.tasks as option, i (option.name)}
					<label
						><input type="radio" name="{id}-task" value={i} bind:group={task} />
						{option.name}</label
					>
				{/each}
			</fieldset>
			<div
				class="lines mono"
				role="img"
				aria-label="The prompt with each token shaded by how much attention head {t.head.layer}.{t
					.head
					.head} gives it from the final arrow. Most goes to the answers of the earlier examples."
			>
				{#each lines(t.head.tokens, t.head.attention) as line, l (l)}
					<p>
						{#each line as tok, i (i)}<span class="tok" style:--a={tok.a / peak}
								>{displayToken(tok.text)}</span
							>{/each}
					</p>
				{/each}
			</div>
			<p class="readout">
				In {canonical.displayName}, attention head {t.head.layer}.{t.head.head} (layer {t.head
					.layer}, head {t.head.head}) sends <strong>{formatPercent(t.head.score)}</strong> of the final
				arrow's attention to the tokens right after the earlier arrows: the answers it could copy the
				pattern from.
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	fieldset {
		border: 0;
		margin: 0 0 var(--space-3);
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		width: 100%;
		padding: 0;
	}

	.lines {
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		font-size: 0.9rem;
	}

	.lines p {
		margin: 0 0 var(--space-1);
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.tok {
		padding: 1px 3px;
		border-radius: 3px;
		border: 1px solid color-mix(in oklch, var(--c-attention) calc(var(--a) * 100%), transparent);
		background: color-mix(in oklch, var(--c-attention-tint) calc(var(--a) * 100%), transparent);
	}

	.readout {
		margin: var(--space-3) 0 0;
	}
</style>
