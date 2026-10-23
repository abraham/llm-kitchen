<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';

	const SHOWN = 5;
	const data = useDataset('encoders/fill-mask');
	let index = $state(0);
	const id = $props.id();
</script>

<WidgetFrame
	title="Fill in the blank"
	source={{ kind: 'recorded', model: 'BERT base and GPT-2 small' }}
	onreset={() => (index = 0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const s = d.sentences[index]}
			{@const [head, tail] = s.sentence.split('[MASK]')}
			<div class="pick">
				<label for="{id}-s" class="label">Sentence</label>
				<select id="{id}-s" bind:value={index}>
					{#each d.sentences as option, i (option.sentence)}
						<option value={i}>{option.sentence.replace('[MASK]', '___')}</option>
					{/each}
				</select>
			</div>
			<p class="sentence">
				{head}<span class="blank"
					><span aria-hidden="true">___</span><span class="visually-hidden">blank</span></span
				>{tail}
			</p>
			<div class="grid">
				<section aria-labelledby="{id}-gpt2">
					<h4 id="{id}-gpt2">{d.models.gpt2.displayName}</h4>
					<p class="reads">
						Reads only <q>{s.before}</q>, the words before the blank.
					</p>
					<ProbBars
						bars={s.gpt2.slice(0, SHOWN).map((c) => ({ label: c.text, p: c.p }))}
						caption="{d.models.gpt2.displayName}'s top guesses for the next token"
					/>
				</section>
				<section aria-labelledby="{id}-bert">
					<h4 id="{id}-bert">{d.models.bert.displayName}</h4>
					<p class="reads">Reads the whole sentence, on both sides of the blank.</p>
					<ProbBars
						bars={s.bert.slice(0, SHOWN).map((c) => ({ label: c.text, p: c.p }))}
						caption="{d.models.bert.displayName}'s top guesses for the blank"
					/>
				</section>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	select {
		font: inherit;
		max-width: 100%;
	}

	.sentence {
		font-size: 1.15rem;
		margin: var(--space-3) 0;
	}

	.blank {
		display: inline-block;
		min-width: 3em;
		text-align: center;
		color: var(--c-token-ink);
		border-bottom: 2px solid var(--c-token);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: var(--space-4);
	}

	h4 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	.reads {
		margin: var(--space-1) 0 var(--space-2);
		font-size: 0.875rem;
		color: var(--ink-muted);
	}
</style>
