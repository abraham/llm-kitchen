<script lang="ts">
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { scrollable } from '#lib/components/ui/scrollable.ts';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { RHYMES } from '#lib/data/rhymes.ts';
	import { bigramCounts, generateBigram, nextWordProbs, words } from '#lib/math/bigram.ts';
	import { seededRandom } from '#lib/math/sampling.ts';

	const texts = RHYMES.map((r) => r.text);
	const rhymeWords = texts.map(words);
	// Each pair remembers where it is in the text, so the cursor can highlight it.
	const pairs = rhymeWords.flatMap((w, r) =>
		w.slice(0, -1).map((word, i) => ({ r, i, from: word, to: w[i + 1] }))
	);
	const fullCounts = bigramCounts(texts);
	const stepper = new Stepper(pairs.length + 1);

	let playing = $state(false);
	let picked = $state('the');
	let start = $state('the');
	let generated = $state<string[]>([]);

	const seen = $derived(pairs.slice(0, stepper.index));
	const current = $derived(stepper.index > 0 ? pairs[stepper.index - 1] : undefined);
	const counts = $derived(stepper.atEnd ? fullCounts : bigramCounts([]));
	const rows = $derived.by(() => {
		const table: Record<string, Record<string, number>> = {};
		for (const p of seen) {
			const row = (table[p.from] ??= {});
			row[p.to] = (row[p.to] ?? 0) + 1;
		}
		return Object.entries(table);
	});
	const starters = Object.keys(fullCounts).sort();

	$effect(() => {
		if (!playing) return;
		const timer = setInterval(() => {
			if (stepper.atEnd) playing = false;
			else stepper.next();
		}, 120);
		return () => clearInterval(timer);
	});

	function generate() {
		const seed = crypto.getRandomValues(new Uint32Array(1))[0];
		generated = generateBigram(fullCounts, start, 16, seededRandom(seed));
	}

	function reset() {
		playing = false;
		stepper.reset();
		generated = [];
		picked = 'the';
		start = 'the';
	}
</script>

<WidgetFrame title="Build a bigram model" source={{ kind: 'computed' }} onreset={reset}>
	<div class="text" role="region" aria-label="Training text: six nursery rhymes">
		{#each rhymeWords as w, r (r)}
			<p>
				{#each w as word, i (i)}
					<span
						class="word"
						class:from={current && current.r === r && current.i === i}
						class:to={current && current.r === r && current.i + 1 === i}>{word}</span
					>
				{/each}
			</p>
		{/each}
	</div>

	<div class="counting">
		<p class="label">
			Counts so far: {seen.length} of {pairs.length} pairs
			{#if current}· just counted <strong class="mono">{current.from} → {current.to}</strong>{/if}
		</p>
		<div class="table" role="region" aria-label="Next-word counts" {@attach scrollable}>
			{#each rows as [from, followers] (from)}
				<div class="row" class:active={current?.from === from}>
					<span class="mono from">{from} →</span>
					{#each Object.entries(followers) as [to, n] (to)}
						<span class="follower mono" class:active={current?.from === from && current?.to === to}
							>{to} <span class="count">×{n}</span></span
						>
					{/each}
				</div>
			{:else}
				<p class="empty">Nothing counted yet. Press Next or Play.</p>
			{/each}
		</div>
	</div>

	{#if stepper.atEnd}
		<div class="after">
			<div>
				<Choice
					legend="After the word"
					appearance="select"
					layout="inline"
					options={starters.map((w) => ({ value: w, label: w }))}
					bind:value={picked}
				/>
				<ProbBars
					caption="Probability of each next word after “{picked}”"
					bars={nextWordProbs(counts, picked).map((o) => ({ label: o.word, p: o.p }))}
				/>
			</div>
			<div>
				<div class="generate">
					<Choice
						legend="Generate starting from"
						appearance="select"
						layout="inline"
						options={starters.map((w) => ({ value: w, label: w }))}
						bind:value={start}
					/>
					<button type="button" onclick={generate}>Generate</button>
				</div>
				{#if generated.length}
					<p class="generated" aria-live="polite">
						{generated.join(' ')}{generated.length < 16 ? ' ■' : ' …'}
					</p>
					{#if generated.length < 16}
						<p class="note">
							■ Stopped: “{generated[generated.length - 1]}” only ever came at the end of a rhyme,
							so nothing ever followed it.
						</p>
					{/if}
				{/if}
			</div>
		</div>
	{/if}

	{#snippet controls()}
		<div class="control-row">
			<button type="button" onclick={() => (playing = !playing)} aria-pressed={playing}>
				{playing ? 'Pause' : 'Play'}
			</button>
			<button type="button" onclick={() => ((playing = false), stepper.go(stepper.count - 1))}>
				Count everything
			</button>
			<StepController
				{stepper}
				label="Counting steps"
				describe={(i) =>
					i === 0 ? 'Nothing counted yet' : `Counted ${pairs[i - 1].from} then ${pairs[i - 1].to}`}
			/>
		</div>
	{/snippet}
</WidgetFrame>

<style>
	.text {
		font-size: 0.95rem;
		line-height: 1.7;
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.text p {
		display: flex;
		flex-wrap: wrap;
		column-gap: 0.35em;
		margin: 0 0 var(--space-2);
	}

	.word {
		border-radius: 3px;
		padding: 0 1px;
	}

	.word.from {
		background: var(--c-token-tint);
		outline: 2px solid var(--c-token);
	}

	.word.to {
		background: var(--c-token-tint);
		outline: 2px dashed var(--c-token);
	}

	.counting {
		margin-top: var(--space-4);
	}

	.table {
		max-height: 14rem;
		overflow-y: auto;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: var(--space-2);
		font-size: 0.85rem;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
		padding: 2px var(--space-1);
		border-radius: 3px;
	}

	.row.active {
		background: var(--c-token-tint);
	}

	.from {
		min-width: 6.5rem;
		font-weight: 600;
	}

	.follower.active {
		font-weight: 700;
		color: var(--c-token-ink);
	}

	.count {
		color: var(--ink-muted);
	}

	.empty {
		margin: 0;
		color: var(--ink-muted);
	}

	.after {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-6);
		margin-top: var(--space-6);
	}

	.generate {
		--control-space: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-2);
	}

	.generated {
		font-family: var(--font-mono);
		background: var(--surface-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
	}

	.control-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
</style>
