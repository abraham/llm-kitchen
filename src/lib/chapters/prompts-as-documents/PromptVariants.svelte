<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import ModelConsent from '#lib/components/frame/ModelConsent.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import { CANONICAL_LIVE, browserModel } from '#lib/models/browser-model.svelte.ts';
	import { BrowserProvider } from '#lib/models/browser-provider.ts';
	import { canonical } from '#lib/models/provider.ts';

	const SHOWN = 6;
	const show = (s: string) => s.replaceAll('\n', ' ↵ ');
	const data = useDataset('prompts/wording');
	const model = browserModel(CANONICAL_LIVE);
	const liveProvider = new BrowserProvider(model, 'gpt2');
	const id = $props.id();
	let group = $state(0);
	let variant = $state(0);
	let wantLive = $state(false);
	let custom = $state('');
	let live = $state<{ text: string; bars: { label: string; p: number }[] } | null>(null);
	let busy = $state(false);

	async function runLive() {
		const text = custom.trimEnd();
		if (!text) return;
		busy = true;
		try {
			const d = await liveProvider.nextTokenDistribution(text, { topK: SHOWN });
			live = { text, bars: d.candidates.map((c) => ({ label: c.token.text, p: c.prob })) };
		} finally {
			busy = false;
		}
	}
</script>

<WidgetFrame
	title="Change the start of the document"
	source={{ kind: 'recorded', model: canonical.displayName }}
	onreset={() => {
		group = 0;
		variant = 0;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const g = d.groups[group]}
			{@const v = g.variants[variant]}
			{@const peak = Math.max(...v.attention)}
			<Choice
				legend="Experiment"
				options={d.groups.map((x, i) => ({ value: i, label: x.name }))}
				bind:value={() => group, (i) => ((group = i), (variant = 0))}
			/>
			<Choice
				legend="Prompt"
				layout="stack"
				options={g.variants.map((v, i) => ({ value: i, label: v.text }))}
				bind:value={variant}
			>
				{#snippet option(o)}<span class="mono" class:on={o.value === variant}>{show(o.label)}</span
					>{/snippet}
			</Choice>

			<div class="grid">
				<div>
					<p class="label">Where the last token looks (all heads averaged)</p>
					<p class="tokens mono">
						{#each v.tokens as t, i (i)}<span
								class="tok"
								style:--a={peak ? v.attention[i] / peak : 0}
								title={formatPercent(v.attention[i])}>{displayToken(t.text)}</span
							>{/each}
					</p>
					<p class="label">Next token</p>
					<ProbBars
						bars={v.top.slice(0, SHOWN).map((c) => ({ label: c.text, p: c.p }))}
						caption="{canonical.displayName}'s top guesses after this prompt"
					/>
				</div>
				<div>
					<table class="data">
						<caption>Chance of {g.watch.map((w) => `“${w.trim()}”`).join(', ')} next</caption>
						<thead>
							<tr>
								<th scope="col">Prompt</th>
								{#each g.watch as w (w)}<th scope="col" class="num">{w.trim()}</th>{/each}
							</tr>
						</thead>
						<tbody>
							{#each g.variants as row, i (row.text)}
								<tr class:on={i === variant}>
									<th scope="row" class="mono">{show(row.text)}</th>
									{#each g.watch as w (w)}<td>{formatPercent(row.watch[w])}</td>{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			<p class="note">
				The shading leaves out the first token, which gets a large share of GPT-2's attention
				whatever the text ({formatPercent(v.firstTokenShare)} for this prompt); the rest is rescaled to
				add up to 100%.
			</p>
		{/snippet}
	</Loading>

	{#if model.status.state === 'ready'}
		<form
			class="custom"
			onsubmit={(e) => {
				e.preventDefault();
				runLive();
			}}
		>
			<label for="{id}-custom" class="label">Your own prompt</label>
			<input
				id="{id}-custom"
				type="text"
				bind:value={custom}
				placeholder="Type the start of a document…"
			/>
			<button type="submit" disabled={busy}>Show the next token</button>
		</form>
		{#if live}
			<ProbBars
				bars={live.bars}
				caption="Live {canonical.displayName}'s top guesses after “{live.text}”"
			/>
		{/if}
	{:else if wantLive || model.active}
		<ModelConsent
			{model}
			purpose="Try your own wording with {canonical.displayName} running live."
		/>
	{:else}
		<button type="button" class="more" onclick={() => (wantLive = true)}
			>Try your own wording…</button
		>
	{/if}
</WidgetFrame>

<style>
	.on {
		font-weight: 700;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-4);
	}

	.tokens {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		margin: var(--space-1) 0 var(--space-3);
	}

	.tok {
		padding: 1px 3px;
		border-radius: 3px;
		border: 1px solid var(--rule);
		background: color-mix(in oklch, var(--c-attention-tint) calc(var(--a) * 100%), transparent);
		border-color: color-mix(in oklch, var(--c-attention) calc(var(--a) * 100%), var(--rule));
	}

	table {
		font-size: 0.8rem;
	}

	tbody th {
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	tr.on th,
	tr.on td {
		font-weight: 700;
		background: var(--surface-2);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}

	.custom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) 0;
	}

	.custom input {
		font: inherit;
		min-width: 16rem;
		flex: 1;
	}

	.more {
		margin-top: var(--space-3);
	}
</style>
