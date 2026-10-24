<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { canonical } from '#lib/models/provider.ts';

	const data = useDataset('prompts/fewshot');
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
			<Choice
				legend="Task"
				options={d.tasks.map((t, i) => ({ value: i, label: t.name }))}
				bind:value={task}
			/>
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
