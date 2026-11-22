<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { formatCount } from '#lib/components/primitives/format.ts';
	import Status from '#lib/components/ui/Status.svelte';
	import {
		annotateUtf8,
		charDisplayName,
		codePointLabel,
		describeByte,
		diffBytes,
		hexOffset,
		type ByteDiffItem
	} from '#lib/math/encoding.ts';

	const PRESETS = [
		{ label: 'The cat → The 🐱', before: 'The cat', after: 'The 🐱' },
		{ label: 'cafe → café', before: 'cafe', after: 'café' },
		{ label: 'The cat → The mat', before: 'The cat', after: 'The mat' }
	] as const;

	const id = $props.id();
	let before = $state<string>(PRESETS[0].before);
	let after = $state<string>(PRESETS[0].after);
	let picked = $state<number | null>(null);

	const beforeBytes = $derived(annotateUtf8(before.slice(0, 24)));
	const afterBytes = $derived(annotateUtf8(after.slice(0, 24)));
	const items = $derived(diffBytes(beforeBytes, afterBytes));

	const defaultIndex = $derived.by(() => {
		const added = items.findIndex((d) => d.kind === 'added');
		if (added >= 0) return added;
		const removed = items.findIndex((d) => d.kind === 'removed');
		return removed >= 0 ? removed : 0;
	});

	const selectedIndex = $derived(
		items.length === 0 ? -1 : picked !== null && picked < items.length ? picked : defaultIndex
	);
	const selected = $derived<ByteDiffItem | undefined>(
		selectedIndex >= 0 ? items[selectedIndex] : undefined
	);

	const removedCount = $derived(items.filter((d) => d.kind === 'removed').length);
	const addedCount = $derived(items.filter((d) => d.kind === 'added').length);

	function isSibling(item: ByteDiffItem, index: number): boolean {
		if (!selected || index === selectedIndex) return false;
		if (item.byte.charByteLength <= 1) return false;
		const sameStream = (item.kind === 'removed') === (selected.kind === 'removed');
		return sameStream && item.byte.charIndex === selected.byte.charIndex;
	}

	function roleLabel(item: ByteDiffItem): string {
		const b = item.byte;
		if (b.role === 'ascii') return 'ASCII (1 byte)';
		if (b.role === 'lead') return `Lead byte (1 of ${b.charByteLength})`;
		return `Continuation (${b.byteInChar} of ${b.charByteLength})`;
	}

	function choosePreset(p: (typeof PRESETS)[number]) {
		before = p.before;
		after = p.after;
		picked = null;
	}
</script>

<WidgetFrame
	title="Inspect the bytes"
	source={{ kind: 'computed' }}
	onreset={() => choosePreset(PRESETS[0])}
>
	<div class="presets" role="group" aria-label="Examples">
		<span class="label">Examples</span>
		{#each PRESETS as p (p.label)}
			<button
				type="button"
				aria-pressed={before === p.before && after === p.after}
				onclick={() => choosePreset(p)}
			>
				{p.label}
			</button>
		{/each}
	</div>

	<div class="inputs">
		<label for="{id}-before">
			<span class="label">Before</span>
			<input
				id="{id}-before"
				bind:value={before}
				oninput={() => (picked = null)}
				maxlength="24"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
		<label for="{id}-after">
			<span class="label">After</span>
			<input
				id="{id}-after"
				bind:value={after}
				oninput={() => (picked = null)}
				maxlength="24"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
	</div>

	<div class="tally">
		<span class="mono">{beforeBytes.length} → {afterBytes.length} bytes</span>
		{#if removedCount === 0 && addedCount === 0}
			<span>No byte changes.</span>
		{:else}
			<span>{removedCount} removed, {addedCount} added.</span>
		{/if}
	</div>

	{#if items.length > 0}
		<div class="strip" role="group" aria-label="Byte diff, select any byte to inspect it">
			{#each items as item, i (i)}
				<button
					type="button"
					class="byte {item.kind} {item.byte.role}"
					class:sibling={isSibling(item, i)}
					aria-pressed={i === selectedIndex}
					onclick={() => (picked = i)}
				>
					<span class="tag mono" aria-hidden="true">
						{item.kind === 'removed' ? '−' : item.kind === 'added' ? '+' : '·'}
					</span>
					<span class="hex mono" aria-hidden="true">{item.byte.hex}</span>
					<span class="sub mono" aria-hidden="true">
						{#if item.byte.charByteLength > 1}
							{item.byte.byteInChar}/{item.byte.charByteLength}
						{:else}
							{item.byte.char === ' ' ? '␣' : item.byte.char}
						{/if}
					</span>
					<span class="visually-hidden">
						{item.byte.hex}, {item.kind === 'same' ? 'unchanged' : item.kind}, offset {hexOffset(
							item.byte.index
						)}, {roleLabel(item)} for {charDisplayName(item.byte.char)}
					</span>
				</button>
			{/each}
		</div>

		<ul class="key" aria-label="Byte key">
			<li><span class="swatch removed" aria-hidden="true">−</span> removed</li>
			<li><span class="swatch added" aria-hidden="true">+</span> added</li>
			<li><span class="swatch cont" aria-hidden="true">10</span> continuation byte</li>
		</ul>
	{/if}

	{#if selected}
		<dl class="detail" aria-label="Selected byte details">
			<div>
				<dt class="label">Character</dt>
				<dd>
					<span class="char mono">{selected.byte.char === ' ' ? '␣' : selected.byte.char}</span>
					<span class="muted mono">
						{codePointLabel(selected.byte.codePoint)} · {formatCount(selected.byte.codePoint)}
					</span>
				</dd>
			</div>
			<div>
				<dt class="label">Byte</dt>
				<dd class="mono">
					<strong>{selected.byte.hex}</strong>
					<span class="muted">({selected.byte.byte}) · {hexOffset(selected.byte.index)}</span>
				</dd>
			</div>
			<div>
				<dt class="label">Bits (prefix · payload)</dt>
				<dd class="bits mono">
					<span class="prefix">{selected.byte.prefixBits}</span><span class="payload"
						>{selected.byte.payloadBits}</span
					>
				</dd>
			</div>
			<div>
				<dt class="label">Role</dt>
				<dd>{roleLabel(selected)}</dd>
			</div>
		</dl>
	{/if}

	<Status lines={2}>
		{#if selected}
			{describeByte(selected)}
		{:else}
			Type in Before or After to inspect its bytes.
		{/if}
	</Status>
</WidgetFrame>

<style>
	.presets {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.presets button[aria-pressed='true'] {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.inputs label {
		display: flex;
		flex-direction: column;
		flex: 1 1 10rem;
		min-width: 0;
	}

	input:not([type]) {
		font: inherit;
		font-family: var(--font-mono);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
		min-width: 0;
	}

	.tally {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: 0.9rem;
		color: var(--ink-muted);
		margin-bottom: var(--space-2);
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: var(--space-2);
	}

	.byte {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 2.8rem;
		padding: var(--space-1) var(--space-2);
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
		color: var(--ink);
		line-height: 1.2;
		transition:
			border-color var(--duration) var(--ease),
			background var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.byte.continuation {
		border-style: dashed;
	}

	.byte.removed {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.byte.removed .hex {
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.byte.added {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.byte.sibling {
		outline: 2px dotted var(--ink-muted);
		outline-offset: 1px;
	}

	.byte[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
		transform: translateY(-1px);
	}

	.tag {
		font-size: 0.7rem;
	}

	.hex {
		font-size: 1rem;
		font-weight: 600;
	}

	.sub {
		font-size: 0.7rem;
	}

	.key {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink-muted);
	}

	.key li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.swatch {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.35rem;
		padding: 0 3px;
		border-radius: 3px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		border: 1.5px solid var(--rule);
	}

	.swatch.removed {
		border-color: var(--c-loss);
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
		text-decoration: line-through;
	}

	.swatch.added {
		border-color: var(--c-token);
		background: var(--c-token-tint);
		color: var(--c-token-ink);
	}

	.swatch.cont {
		border-style: dashed;
		background: var(--surface-2);
		color: var(--ink);
	}

	.detail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.detail dt {
		margin-bottom: 2px;
	}

	.detail dd {
		margin: 0;
		font-size: 0.95rem;
	}

	.char {
		font-size: 1.05rem;
		font-weight: 600;
		margin-right: var(--space-1);
	}

	.muted {
		color: var(--ink-muted);
		font-size: 0.85rem;
	}

	.bits {
		display: inline-flex;
		gap: 3px;
		font-size: 0.95rem;
	}

	.prefix {
		padding: 0 var(--space-1);
		border-radius: 3px;
		background: var(--c-token-tint);
		color: var(--c-token-ink);
		border: 1px solid var(--c-token);
		font-weight: 600;
	}

	.payload {
		padding: 0 var(--space-1);
		border-radius: 3px;
		background: var(--surface);
		color: var(--ink);
		border: 1px solid var(--rule);
	}
</style>
