<script lang="ts">
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { canonical } from '#lib/models/provider.ts';

	/** Attention keeps a key and a value vector for every earlier token, in every block. */
	const PER_TOKEN = 2 * canonical.layers * canonical.embeddingSize;
	const RECURRENT = 32;
	let tokens = $state(10);
	const fmt = (n: number) => n.toLocaleString('en-US');
	const attention = $derived(tokens * PER_TOKEN);
	const max = canonical.contextLength * PER_TOKEN;
</script>

<WidgetFrame
	title="Memory as the text grows"
	source={{ kind: 'computed' }}
	onreset={() => (tokens = 10)}
>
	<div class="tokens">
		<Slider
			label="Tokens read so far"
			min={1}
			max={canonical.contextLength}
			format={fmt}
			bind:value={tokens}
		/>
	</div>
	<dl class="bars">
		<div>
			<dt>{canonical.displayName}, with attention</dt>
			<dd>
				<span class="bar attention" style:width="{(attention / max) * 70}%"></span>
				<span class="mono">{fmt(attention)} numbers</span>
			</dd>
		</div>
		<div>
			<dt>The tiny recurrent model above</dt>
			<dd>
				<span class="bar recurrent"></span>
				<span class="mono">{fmt(RECURRENT)} numbers</span>
			</dd>
		</div>
	</dl>
	<p class="note">
		So that later tokens can look back without redoing the work, {canonical.displayName} keeps a key and
		a value (<ChapterRef to="attention" />) for every token it has read, in each of its {canonical.layers}
		blocks: 2 × {canonical.layers}
		× {canonical.embeddingSize} = {fmt(PER_TOKEN)} numbers per token, up to its limit of {fmt(
			canonical.contextLength
		)} tokens. This store is the KV cache (<ChapterRef to="caching" />). The recurrent model keeps
		only its memory.
	</p>
</WidgetFrame>

<style>
	.tokens {
		max-width: 24rem;
	}

	.bars {
		margin: 0;
		display: grid;
		gap: var(--space-3);
	}

	dt {
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	dd {
		margin: var(--space-1) 0 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.85rem;
	}

	.bar {
		display: block;
		height: 1rem;
		min-width: 3px;
		border-radius: 2px;
		flex: none;
	}

	.attention {
		background: var(--c-attention);
	}

	.recurrent {
		width: 3px;
		background: var(--c-vector);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
