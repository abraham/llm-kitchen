<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import { TOKENIZERS, tokenize, type TokenizerName } from '#lib/models/tokenizers.ts';

	const START = 'The cat sat on the mat. Tokenization splits unbelievably long words into pieces.';
	let text = $state(START);
	let names = $state<TokenizerName[]>(['gpt2']);
	const id = $props.id();

	const results = $derived(
		names.map((name) => ({
			name,
			tokens: typeof window === 'undefined' ? new Promise<never>(() => {}) : tokenize(name, text)
		}))
	);
</script>

<WidgetFrame
	title="See the tokens"
	source={{ kind: 'computed' }}
	onreset={() => {
		text = START;
		names = ['gpt2'];
	}}
>
	<label class="label" for="{id}-text">Paste or type any text</label>
	<textarea id="{id}-text" bind:value={text} rows="3" spellcheck="false"></textarea>

	<fieldset>
		<legend class="label">Tokenizers</legend>
		{#each Object.entries(TOKENIZERS) as [name, t] (name)}
			<label>
				<input type="checkbox" bind:group={names} value={name} />
				{t.label} <span class="mono enc">({t.encoding})</span>
			</label>
		{/each}
	</fieldset>

	{#each results as { name, tokens } (name)}
		<section class="result" aria-label="{TOKENIZERS[name].label} tokens">
			{#await tokens}
				<p class="label">Loading the {TOKENIZERS[name].label} tokenizer…</p>
			{:then list}
				<p class="label">
					{TOKENIZERS[name].label}: <strong>{list.length} tokens</strong> for {[...text].length} characters
				</p>
				<ol class="tokens">
					{#each list as token, i (i)}
						<li><TokenChip {token} /></li>
					{/each}
				</ol>
			{/await}
		</section>
	{/each}
</WidgetFrame>

<style>
	textarea {
		width: 100%;
		font: inherit;
		font-family: var(--font-mono);
		font-size: 0.95rem;
		padding: var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
		resize: vertical;
	}

	fieldset {
		border: none;
		padding: 0;
		margin: var(--space-2) 0 var(--space-4);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		float: left;
		margin-right: var(--space-2);
	}

	.enc {
		color: var(--ink-muted);
		font-size: 0.75rem;
	}

	.result + .result {
		margin-top: var(--space-4);
	}

	.tokens {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}
</style>
