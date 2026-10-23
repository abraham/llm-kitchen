<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import type { ContextSession } from '#lib/harness/agent.ts';
	import { project } from '#lib/math/vectors.ts';
	import { loadJson, type EmbeddingMapData } from '#lib/models/load-json.ts';

	const data = Promise.all([
		loadJson<ContextSession>('agent/context.json'),
		loadJson<EmbeddingMapData>('embeddings/minilm-map.json')
	]);

	const STRATEGIES = {
		all: { label: 'Keep everything', note: 'Over budget. A real harness can’t send this.' },
		dropOldest: { label: 'Drop the oldest', note: 'The first task is cut to make room.' },
		summarize: {
			label: 'Summarize the oldest',
			note: 'The first task is replaced by a short summary the model wrote.'
		},
		retrieve: {
			label: 'Retrieve what’s relevant',
			note: 'The earlier turn closest in meaning to the question is put back.'
		}
	} as const;
	type Key = keyof typeof STRATEGIES;
	let strategy = $state<Key>('all');
	const id = $props.id();

	function sizes(s: ContextSession, key: Key) {
		const st = s.strategies[key];
		const kept = s.turns.reduce((a, t, i) => a + (st.kept.includes(i) ? t.tokens : 0), 0);
		const note = st.noteTokens ?? 0;
		return { kept, note, total: s.baseTokens + kept + note + s.questionTokens };
	}
</script>

<WidgetFrame
	title="The context budget"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct' }}
	onreset={() => (strategy = 'all')}
>
	<Loading promise={data}>
		{#snippet children([s, map])}
			{@const st = s.strategies[strategy]}
			{@const all = sizes(s, 'all').total}
			{@const used = sizes(s, strategy)}
			{@const scale = (n: number) => (n / all) * 100}
			<p class="intro">
				The agent from Ch 23 did six tasks in a row, one per rhyme. Then you ask: <strong
					>“{s.question}”</strong
				>
			</p>

			<fieldset class="pick">
				<legend class="label">When the conversation doesn’t fit</legend>
				{#each Object.entries(STRATEGIES) as [key, v] (key)}
					<label
						><input type="radio" name="{id}-s" bind:group={strategy} value={key} /> {v.label}</label
					>
				{/each}
			</fieldset>

			<div
				class="bar"
				role="img"
				aria-label="{used.total.toLocaleString('en-US')} of a {s.budget.toLocaleString(
					'en-US'
				)}-token budget"
			>
				<span class="seg base" style:width="{scale(s.baseTokens)}%" title="System prompt and tools"
				></span>
				{#if st.noteTokens}
					<span
						class="seg note"
						style:width="{scale(used.note)}%"
						title={strategy === 'summarize' ? 'Summary' : 'Retrieved turn'}
					></span>
				{/if}
				{#each s.turns as t, i (i)}
					<span
						class="seg turn"
						class:dropped={!st.kept.includes(i)}
						style:width="{scale(t.tokens)}%"
						title="Task {i + 1}">{i + 1}</span
					>
				{/each}
				<span class="seg question" style:width="{scale(s.questionTokens)}%" title="Your question"
				></span>
				<span class="budget" style:left="{scale(s.budget)}%"></span>
			</div>
			<p class="numbers" class:over={used.total > s.budget}>
				{used.total.toLocaleString('en-US')} tokens · budget {s.budget.toLocaleString('en-US')} · {STRATEGIES[
					strategy
				].note}
			</p>
			<ul class="legend" aria-hidden="true">
				<li><span class="seg base"></span>system prompt and tools</li>
				<li><span class="seg turn"></span>tasks 1–6</li>
				<li><span class="seg turn dropped"></span>left out</li>
				<li><span class="seg note"></span>summary or retrieved text</li>
				<li><span class="seg question"></span>your question</li>
			</ul>

			{#if strategy === 'summarize' && st.summary}
				<p class="box"><span class="label">The summary</span> {st.summary}</p>
			{/if}
			{#if strategy === 'retrieve'}
				{@const pts = s.turns.map((t) => project(t.vector, map.pca.mean, map.pca.components))}
				{@const q = project(s.questionVector, map.pca.mean, map.pca.components)}
				{@const xs = [...pts.map((p) => p[0]), q[0]]}
				{@const ys = [...pts.map((p) => p[1]), q[1]]}
				{@const [x0, x1, y0, y1] = [
					Math.min(...xs),
					Math.max(...xs),
					Math.min(...ys),
					Math.max(...ys)
				]}
				{@const sx = (x: number) => 30 + ((x - x0) / (x1 - x0 || 1)) * 300}
				{@const sy = (y: number) => 150 - ((y - y0) / (y1 - y0 || 1)) * 120}
				<div class="retrieval">
					<svg
						viewBox="0 0 360 180"
						role="img"
						aria-label="The question and the six tasks on the meaning map from Ch 5; task 1 is the closest."
					>
						{#each pts as p, i (i)}
							{@const hit = st.retrieved?.includes(i)}
							{#if hit}<line
									x1={sx(q[0])}
									y1={sy(q[1])}
									x2={sx(p[0])}
									y2={sy(p[1])}
									class="link"
								/>{/if}
							<circle cx={sx(p[0])} cy={sy(p[1])} r={hit ? 8 : 6} class:hit class="dot" />
							<text x={sx(p[0])} y={sy(p[1]) - 11} class="lbl">{i + 1}</text>
						{/each}
						<rect x={sx(q[0]) - 6} y={sy(q[1]) - 6} width="12" height="12" class="q" />
						<text x={sx(q[0])} y={sy(q[1]) + 22} class="lbl">question</text>
					</svg>
					<ol class="sims">
						{#each s.turns as t, i (i)}
							<li class:hit={st.retrieved?.includes(i)}>
								Task {i + 1}: similarity <span class="mono">{t.similarity.toFixed(2)}</span>
							</li>
						{/each}
					</ol>
				</div>
			{/if}

			<p class="box answer" aria-live="polite">
				<span class="label"
					>{strategy === 'all'
						? 'If it could all be sent, the model would answer'
						: 'The model’s answer'}</span
				>
				{st.answer}
			</p>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.intro {
		margin-top: 0;
	}

	.pick {
		border: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	legend {
		margin-bottom: var(--space-1);
	}

	.bar {
		position: relative;
		display: flex;
		height: 2rem;
		border: 1px solid var(--rule);
		border-radius: 3px;
		overflow: visible;
	}

	.seg {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--c-vector-ink);
		border-right: 1px solid var(--surface);
		transition: width var(--duration) var(--ease);
	}

	.seg.base {
		background: var(--c-harness-tint);
		box-shadow: inset 0 0 0 1.5px var(--c-harness);
	}

	.seg.turn {
		background: var(--c-vector-tint);
		box-shadow: inset 0 0 0 1.5px var(--c-vector);
	}

	.seg.turn.dropped {
		width: 0 !important;
		overflow: hidden;
		border: none;
	}

	.seg.note {
		background: var(--c-weight-tint);
		box-shadow: inset 0 0 0 1.5px var(--c-weight);
	}

	.seg.question {
		background: var(--c-prob-tint);
		box-shadow: inset 0 0 0 1.5px var(--c-prob);
	}

	.budget {
		position: absolute;
		top: -6px;
		bottom: -6px;
		border-left: 2px dashed var(--c-loss);
	}

	.numbers {
		font-family: var(--font-sans);
		font-size: 0.85rem;
		margin: var(--space-2) 0;
	}

	.numbers.over {
		color: var(--c-loss-ink);
	}

	.legend {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.75rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.legend .seg {
		width: 0.9rem;
		height: 0.9rem;
	}

	.legend .seg.dropped {
		width: 0.9rem !important;
		background: var(--surface);
		box-shadow: inset 0 0 0 1.5px var(--rule);
	}

	.box {
		padding: var(--space-2) var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.box .label {
		display: block;
	}

	.answer {
		border-left: 3px solid var(--c-vector);
	}

	.retrieval {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	svg {
		width: 100%;
		max-width: 360px;
		height: auto;
		font-family: var(--font-sans);
	}

	.dot {
		fill: var(--c-vector-tint);
		stroke: var(--c-vector);
		stroke-width: 1.5;
	}

	.dot.hit {
		fill: var(--c-weight);
		stroke: var(--c-weight);
	}

	.q {
		fill: var(--c-prob);
	}

	.link {
		stroke: var(--c-weight);
		stroke-width: 2;
	}

	.lbl {
		font-size: 11px;
		fill: var(--ink);
		text-anchor: middle;
	}

	.sims {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.85rem;
	}

	.sims .hit {
		font-weight: 700;
		color: var(--c-weight-ink);
	}
</style>
