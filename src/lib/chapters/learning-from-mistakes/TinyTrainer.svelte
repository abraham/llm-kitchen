<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import LossCurve from '#lib/components/primitives/LossCurve.svelte';
	import type { TrainerRequest, TrainerResponse } from '#lib/workers/trainer.worker.ts';
	import TrainerWorker from '#lib/workers/trainer.worker.ts?worker';
	import { formatCount } from '#lib/components/primitives/format.ts';

	let worker: Worker | undefined;
	let info = $state<Extract<TrainerResponse, { type: 'info' }> | null>(null);
	let step = $state(0);
	let losses = $state<number[]>([]);
	let samples = $state<{ step: number; text: string }[]>([]);
	let running = $state(false);
	let done = $state(false);

	function send(request: TrainerRequest) {
		worker?.postMessage(request);
	}

	onMount(() => {
		worker = new TrainerWorker();
		worker.onmessage = (event: MessageEvent<TrainerResponse>) => {
			const r = event.data;
			if (r.type === 'info') info = r;
			else {
				step = r.step;
				losses = r.step === 0 ? [r.loss] : [...losses, r.loss];
				if (r.sample !== undefined)
					samples = [{ step: r.step, text: r.sample }, ...samples].slice(0, 6);
				done = r.done;
				if (r.done) running = false;
			}
		};
		reset();
	});

	onDestroy(() => worker?.terminate());

	function toggle() {
		running = !running;
		send({ type: running ? 'start' : 'pause' });
	}

	function reset() {
		running = false;
		done = false;
		samples = [];
		losses = [];
		send({ type: 'reset', seed: Math.floor(Math.random() * 1e6) });
	}

	const uniform = $derived(info ? Math.log(info.vocabSize) : undefined);
</script>

<WidgetFrame title="Train a tiny language model" source={{ kind: 'computed' }} onreset={reset}>
	<div class="layout">
		<div>
			<LossCurve values={losses} baseline={uniform} baselineLabel="random guessing" label="Loss" />
			<p class="readout mono" aria-live="off">
				step {step}{#if losses.length}
					· loss {losses.at(-1)!.toFixed(2)}{/if}
			</p>
			{#if info}
				<p class="facts">
					{formatCount(info.parameters)} weights, learning to predict the next of
					{info.vocabSize - 1} characters from the 3 before it, using {formatCount(info.examples)}
					examples from the six rhymes.
				</p>
			{/if}
		</div>
		<div>
			<p class="label">What it writes (newest first)</p>
			<ol class="samples">
				{#each samples as s (s.step)}
					<li>
						<span class="mono step">{s.step}</span>
						<span class="text">{s.text || '(nothing)'}</span>
					</li>
				{/each}
			</ol>
		</div>
	</div>
	<button type="button" onclick={toggle} aria-pressed={running} disabled={done || !info}>
		{done ? 'Finished' : running ? 'Pause' : step ? 'Keep training' : 'Train'}
	</button>
	<p class="visually-hidden" aria-live="polite">
		{#if done}Training finished at step {step} with loss {losses.at(-1)?.toFixed(2)}.{/if}
	</p>
</WidgetFrame>

<style>
	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-3);
	}

	.readout {
		font-size: 0.85rem;
		margin: var(--space-1) 0;
	}

	.facts {
		font-size: 0.875rem;
		color: var(--ink-muted);
	}

	.samples {
		list-style: none;
		padding: 0;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.samples li {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--rule);
	}

	.samples li:first-child .text {
		color: var(--ink);
		font-weight: 600;
	}

	.step {
		color: var(--ink-muted);
		min-width: 3.5em;
		text-align: right;
	}

	.text {
		color: var(--ink-muted);
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
