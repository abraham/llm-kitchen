<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { DEVICES, MEMORY_MODELS } from './data.ts';
	import { weightBytes } from '#lib/math/quantize.ts';

	const BITS = [16, 8, 4];
	const DEFAULT = MEMORY_MODELS.findIndex((m) => m.name === 'Gemma 4 31B');
	let model = $state(DEFAULT);
	let bits = $state(16);

	const m = $derived(MEMORY_MODELS[model]);
	const gb = $derived(weightBytes(m.stored, bits) / 1e9);
	const scale = $derived(Math.max(gb, ...DEVICES.map((d) => d.gb)));
	const fmt = (n: number) =>
		n < 1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toString();
	const billions = (n: number) => (n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 });
</script>

<WidgetFrame
	title="Will it fit?"
	source={{ kind: 'computed' }}
	onreset={() => {
		model = DEFAULT;
		bits = 16;
	}}
>
	<div class="controls">
		<Choice
			legend="Model"
			appearance="select"
			options={MEMORY_MODELS.map((mm, i) => ({ value: i, label: mm.name }))}
			bind:value={model}
		/>
		<Choice
			legend="Bits per weight"
			options={BITS.map((b) => ({ value: b, label: String(b) }))}
			bind:value={bits}
		/>
	</div>

	<p class="total">
		Weights: <strong class="mono">{fmt(gb)} GB</strong>
		<span class="sum">({billions(m.stored)} billion numbers × {bits} bits ÷ 8)</span>
	</p>

	<ul class="bars" aria-label="Memory compared with example devices">
		<li>
			<span class="name">The weights</span>
			<span class="bar"><span class="fill weights" style:width="{(gb / scale) * 100}%"></span></span
			>
			<span class="mono">{fmt(gb)} GB</span>
		</li>
		{#each DEVICES as d (d.name)}
			<li class:fits={gb < d.gb}>
				<span class="name">{d.name}</span>
				<span class="bar"
					><span class="fill device" style:width="{(d.gb / scale) * 100}%"></span></span
				>
				<span class="verdict">{gb < d.gb ? 'the weights alone fit' : 'too small'}</span>
			</li>
		{/each}
	</ul>

	<p class="note">
		{#if m.perToken}
			Only about {billions(m.perToken)} billion of these weights do the work for each token, but all {billions(
				m.stored
			)} billion have to be stored.
		{/if}
		Simplified: the KV cache adds more memory as the context grows, the runtime needs some, and so does
		everything else running on the device.
	</p>
</WidgetFrame>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--space-3) var(--space-6);
		margin-bottom: var(--space-3);
		--control-space: 0;
	}

	.total {
		margin: 0 0 var(--space-3);
	}

	.sum {
		color: var(--ink-muted);
		font-size: 0.9rem;
	}

	.bars {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: grid;
		gap: var(--space-2);
		font-size: 0.9rem;
	}

	.bars li {
		display: grid;
		grid-template-columns: minmax(9rem, auto) 1fr auto;
		align-items: center;
		gap: var(--space-2);
	}

	@media (max-width: 30rem) {
		.bars li {
			grid-template-columns: 1fr auto;
		}

		.bars .bar {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}

	.bar {
		height: 0.9rem;
		background: var(--surface-2);
		border-radius: 3px;
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
	}

	.weights {
		background: var(--c-weight);
	}

	.device {
		background: var(--c-harness);
	}

	.fits .device {
		background: var(--c-vector);
	}

	.verdict {
		color: var(--ink-muted);
	}

	.fits .verdict {
		color: var(--c-vector-ink);
		font-weight: 600;
	}

	.note {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ink-muted);
	}
</style>
