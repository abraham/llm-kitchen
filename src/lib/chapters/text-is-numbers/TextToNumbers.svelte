<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { codePointLabel, encodeText, hexByte } from '#lib/math/encoding.ts';

	const START = 'The cat sat on the';
	let text = $state(START);
	let view = $state<'codepoint' | 'bytes'>('codepoint');

	const chars = $derived(encodeText(text.slice(0, 60)));
	const byteCount = $derived(chars.reduce((a, c) => a + c.utf8.length, 0));
</script>

<WidgetFrame
	title="Text is just numbers"
	source={{ kind: 'computed' }}
	onreset={() => {
		text = START;
		view = 'codepoint';
	}}
>
	<div class="controls">
		<label>
			<span class="label">Type anything</span>
			<input bind:value={text} maxlength="60" autocomplete="off" spellcheck="false" />
		</label>
		<fieldset>
			<legend class="label">Show</legend>
			<label><input type="radio" bind:group={view} value="codepoint" /> Unicode number</label>
			<label><input type="radio" bind:group={view} value="bytes" /> UTF-8 bytes</label>
		</fieldset>
	</div>

	<ol class="flaps" aria-label="Characters and their numbers">
		{#each chars as c, i (i)}
			<li class:space={c.char === ' '}>
				<span class="char" aria-hidden="true">{c.char === ' ' ? '␣' : c.char}</span>
				{#key `${c.char}-${view}`}
					<span class="num">
						{#if view === 'codepoint'}
							<span class="dec">{c.codePoint}</span>
							<span class="hex">{codePointLabel(c.codePoint)}</span>
						{:else}
							<span class="dec">{c.utf8.join(' ')}</span>
							<span class="hex">{c.utf8.map(hexByte).join(' ')}</span>
						{/if}
					</span>
				{/key}
				<span class="visually-hidden">
					{c.char === ' ' ? 'space' : c.char}: {view === 'codepoint'
						? c.codePoint
						: `bytes ${c.utf8.join(', ')}`}
				</span>
			</li>
		{/each}
	</ol>

	<p class="summary" aria-live="polite">
		{chars.length} characters, {byteCount} bytes.
		{#if byteCount > chars.length}
			Some characters need more than one byte.
		{/if}
	</p>
</WidgetFrame>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: end;
		margin-bottom: var(--space-4);
	}

	.controls > label {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 14rem;
	}

	input:not([type]) {
		font: inherit;
		font-family: var(--font-mono);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		float: left;
		margin-right: var(--space-2);
	}

	.flaps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	li {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3.2rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface-2);
	}

	.char {
		font-family: var(--font-mono);
		font-size: 1.3rem;
		padding: var(--space-1);
		color: var(--c-token-ink);
	}

	.space .char {
		color: var(--ink-muted);
	}

	.num {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		padding: var(--space-1);
		background: var(--ink);
		color: var(--page);
		font-family: var(--font-mono);
		animation: flip calc(var(--duration) * 1.5) var(--ease);
		transform-origin: top;
	}

	.dec {
		font-size: 0.95rem;
	}

	.hex {
		font-size: 0.65rem;
		opacity: 0.8;
	}

	@keyframes flip {
		from {
			transform: rotateX(-90deg);
		}
		to {
			transform: rotateX(0);
		}
	}

	.summary {
		margin: var(--space-3) 0 0;
		font-size: 0.95rem;
	}
</style>
