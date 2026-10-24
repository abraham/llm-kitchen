<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { FrameLoop } from '#lib/components/frame/loop.svelte.ts';
	import Slider from '#lib/components/ui/Slider.svelte';
	import LossCurve from '#lib/components/primitives/LossCurve.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { RHYMES } from '#lib/data/rhymes.ts';
	import { CharRNN, RNNTrainer } from '#lib/math/rnn.ts';
	import { seededRandom } from '#lib/math/sampling.ts';
	import { formatCount } from '#lib/components/primitives/format.ts';

	const HIDDEN = 32;
	const MAX_STEPS = 1500;
	const PHRASE = 'humpty dumpty sat on a wall';
	const texts = RHYMES.map((r) => r.text.toLowerCase());
	const vocab = [...new Set(texts.join(''))].sort();
	const encode = (s: string) => [...s].map((c) => vocab.indexOf(c));

	let random = seededRandom(1);
	let trainer = $state.raw(new RNNTrainer(new CharRNN(vocab.length, HIDDEN, 1)));
	let losses = $state<number[]>([]);
	let version = $state(0);
	let read = $state(8);

	function batch(): number[][] {
		return Array.from({ length: 16 }, () => {
			const t = texts[Math.floor(random() * texts.length)];
			const start = Math.floor(random() * (t.length - 24));
			return encode(t.slice(start, start + 24));
		});
	}

	const loop = new FrameLoop(() => {
		let loss = 0;
		for (let i = 0; i < 5; i++) loss = trainer.step(batch());
		losses = [...losses, loss];
		version++;
		return trainer.steps < MAX_STEPS;
	});

	function reset() {
		loop.stop();
		const seed = Math.floor(Math.random() * 1e6);
		random = seededRandom(seed);
		trainer = new RNNTrainer(new CharRNN(vocab.length, HIDDEN, seed));
		losses = [];
		read = 8;
		version++;
	}

	const steps = $derived.by(() => (void version, trainer.steps));

	const memory = $derived.by(() => {
		void version;
		let h: Float64Array = new Float64Array(HIDDEN);
		let probs: Float64Array = new Float64Array(vocab.length);
		for (const c of encode(PHRASE.slice(0, read))) ({ h, probs } = trainer.model.step(h, c));
		const guesses = [...probs]
			.map((p, k) => ({ label: vocab[k], p }))
			.sort((a, b) => b.p - a.p)
			.slice(0, 4);
		return { h: [...h], guesses };
	});
	const show = (c: string) => (c === ' ' ? '·' : c);
</script>

<WidgetFrame title="A model with a memory" source={{ kind: 'computed' }} onreset={reset}>
	<div class="layout">
		<div>
			<p class="phrase mono" aria-hidden="true">
				{#each PHRASE as c, i (i)}<span class:done={i < read} class:next={i === read}
						>{show(c)}</span
					>{/each}
			</p>
			<Slider label="Characters read" min={1} max={PHRASE.length - 1} bind:value={read} />
			<p class="label">Its memory after “{PHRASE.slice(0, read)}”</p>
			<VectorStrip values={memory.h} cells={HIDDEN} scale={1} label="The model's memory" />
			<p class="label guess-label">What it expects next</p>
			<ProbBars
				bars={memory.guesses.map((g) => ({ ...g, highlight: g.label === PHRASE[read] }))}
				caption="The model's top guesses for the next character"
			/>
		</div>
		<div>
			<LossCurve
				values={losses}
				baseline={Math.log(vocab.length)}
				baselineLabel="random guessing"
				label="Loss"
			/>
			<p class="readout mono">
				step {steps}{losses.length ? ` · loss ${losses.at(-1)!.toFixed(2)}` : ''}
			</p>
			<p class="facts">
				{formatCount(trainer.model.parameterCount)} weights. However much it has read, its memory is the
				same {HIDDEN} numbers.
			</p>
		</div>
	</div>
	<button
		type="button"
		onclick={() => loop.toggle()}
		aria-pressed={loop.running}
		disabled={steps >= MAX_STEPS}
	>
		{steps >= MAX_STEPS ? 'Finished' : loop.running ? 'Pause' : steps ? 'Keep training' : 'Train'}
	</button>
</WidgetFrame>

<style>
	.layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-3);
	}

	.phrase {
		font-size: 1.05rem;
		margin: 0 0 var(--space-2);
		overflow-wrap: anywhere;
	}

	.phrase span {
		color: var(--ink-muted);
	}

	.phrase .done {
		color: var(--ink);
		font-weight: 600;
	}

	.phrase .next {
		color: var(--c-token-ink);
		border-bottom: 2px solid var(--c-token);
	}

	.guess-label {
		margin-top: var(--space-3);
	}

	.readout {
		font-size: 0.85rem;
		margin: var(--space-1) 0;
	}

	.facts {
		font-size: 0.875rem;
		color: var(--ink-muted);
	}
</style>
