<script lang="ts">
	import ChapterRef from '#lib/components/layout/ChapterRef.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { COLLECTIONS, NOT_IN_NAME, decodeName } from './data.ts';

	const DEFAULT = 'google/gemma-4-26B-A4B-it';
	const id = $props.id();
	let model = $state(DEFAULT);
	let selected = $state(0);
	const decoded = $derived(decodeName(model));
	const card = $derived(
		decoded.org === 'google'
			? NOT_IN_NAME[decoded.parts.find((p) => p.kind === 'size' || p.kind === 'effective')!.text]
			: undefined
	);
</script>

<WidgetFrame
	title="What the name tells you"
	source={{ kind: 'computed' }}
	onreset={() => {
		model = DEFAULT;
		selected = 0;
	}}
>
	<div class="pick">
		<label class="label" for="{id}-model">Model</label>
		<select id="{id}-model" bind:value={model} onchange={() => (selected = 0)}>
			{#each COLLECTIONS as c (c.name)}
				<optgroup label={c.name}>
					{#each c.ids as m (m)}
						<option value={m}>{m}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</div>

	<div class="name mono" role="group" aria-label="Parts of the name">
		<span class="org">{decoded.org}/</span>{#each decoded.parts as p, i (i)}{#if i > 0}<span
					class="dash">-</span
				>{/if}<button
				type="button"
				class="part {p.kind}"
				aria-pressed={i === selected}
				onclick={() => (selected = i)}>{p.text}</button
			>{/each}
	</div>

	<dl class="parts">
		{#each decoded.parts as p, i (i)}
			<div class:selected={i === selected}>
				<dt class="mono {p.kind}">{p.text}</dt>
				<dd>
					{p.meaning}
					{#if p.chapters.length}
						See {#each p.chapters as slug, k (slug)}{k > 0 ? ' and ' : ''}<ChapterRef
								to={slug}
								title
							/>{/each}.
					{/if}
				</dd>
			</div>
		{/each}
		{#if decoded.base}
			<div>
				<dt class="mono tuning">(no -it)</dt>
				<dd>
					A base model: it continues text rather than answering. See <ChapterRef
						to="predictor-to-assistant"
						title
					/>.
				</dd>
			</div>
		{/if}
	</dl>

	<div class="card">
		<p class="label">Not in the name</p>
		{#if card}
			<p>
				From the model card: it reads up to {card.context}, takes {card.inputs} as input, has a thinking
				mode you can switch on (<ChapterRef to="reasoning-models" />), and is licensed under Apache
				2.0.
			</p>
		{:else}
			<p>
				The context length, the inputs it takes, and the license are on the model card, not in the
				name.
			</p>
		{/if}
	</div>
</WidgetFrame>

<style>
	.pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	select {
		font: inherit;
		max-width: 100%;
	}

	.name {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		font-size: 1.05rem;
		margin: 0 0 var(--space-3);
		overflow-wrap: anywhere;
	}

	.org,
	.dash {
		color: var(--ink-muted);
	}

	.part {
		font: inherit;
		padding: 2px var(--space-1);
		border: 1px solid var(--rule);
		border-radius: 3px;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}

	.part[aria-pressed='true'] {
		outline: 2px solid var(--c-prob);
		outline-offset: 1px;
	}

	.family {
		background: var(--c-harness-tint);
	}

	.size,
	.effective,
	.active {
		background: var(--c-weight-tint);
	}

	.tuning,
	.drafter {
		background: var(--c-prob-tint);
	}

	.quantization {
		background: var(--c-token-tint);
	}

	.format {
		background: var(--c-vector-tint);
	}

	.parts {
		margin: 0;
		display: grid;
		gap: var(--space-2);
	}

	.parts div {
		display: grid;
		grid-template-columns: minmax(6rem, auto) 1fr;
		gap: var(--space-2);
		padding: var(--space-1);
		border-radius: var(--radius);
	}

	.parts div.selected {
		box-shadow: inset 3px 0 0 var(--c-prob);
	}

	dt {
		align-self: start;
		padding: 0 var(--space-1);
		border-radius: 3px;
		justify-self: start;
	}

	dd {
		margin: 0;
		font-size: 0.95rem;
	}

	@media (max-width: 30rem) {
		.parts div {
			grid-template-columns: 1fr;
		}
	}

	.card {
		margin-top: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px solid var(--rule);
		font-size: 0.95rem;
	}

	.card p {
		margin: 0 0 var(--space-1);
	}
</style>
