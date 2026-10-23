<script lang="ts">
	import Loading from '#lib/components/layout/Loading.svelte';
	import ModelConsent from '#lib/components/layout/ModelConsent.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { nearest, project } from '#lib/math/vectors.ts';
	import { MINILM, browserModel } from '#lib/models/browser-model.svelte.ts';
	import { loadJson, type EmbeddingMapData, type EmbeddingVectors } from '#lib/models/load-json.ts';

	const data = loadJson<EmbeddingMapData>('embeddings/minilm-map.json');
	const model = browserModel(MINILM);
	const id = $props.id();

	let selected = $state('cat');
	let showAnalogy = $state(false);
	let wantLive = $state(false);
	let newWord = $state('');
	let added = $state<
		{ word: string; x: number; y: number; neighbors: { word: string; similarity: number }[] }[]
	>([]);
	let liveError = $state('');

	const W = 640;
	const H = 420;
	const PAD = 40;

	function scales(d: EmbeddingMapData) {
		const xs = d.words.map((w) => w.x);
		const ys = d.words.map((w) => w.y);
		const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
		const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
		return {
			sx: (x: number) => clamp(PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD), 8, W - 8),
			sy: (y: number) => clamp(H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD), 8, H - 8)
		};
	}

	/**
	 * Which words get a text label: the important ones always, the rest only where they don't
	 * overlap a label already placed. Hidden ones still show their name on hover.
	 */
	function visibleLabels(
		points: { word: string; x: number; y: number }[],
		important: Set<string>,
		sx: (x: number) => number,
		sy: (y: number) => number
	): Set<string> {
		const order = [...points].sort(
			(a, b) => Number(important.has(b.word)) - Number(important.has(a.word))
		);
		const boxes: { x: number; y: number; w: number; h: number }[] = [];
		const shown: string[] = [];
		for (const p of order) {
			const big = important.has(p.word);
			const box = {
				x: sx(p.x) + 6,
				y: sy(p.y) - (big ? 9 : 7),
				w: p.word.length * (big ? 7.5 : 5.2),
				h: big ? 13 : 10
			};
			const hit = boxes.some(
				(b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h
			);
			if (big || !hit) {
				boxes.push(box);
				shown.push(p.word);
			}
		}
		return new Set(shown);
	}

	async function addWord(d: EmbeddingMapData) {
		const word = newWord.trim().toLowerCase();
		if (!word || added.some((a) => a.word === word)) return;
		liveError = '';
		try {
			const [[vector], raw] = await Promise.all([
				model.embed([word]),
				loadJson<EmbeddingVectors>('embeddings/minilm-vectors.json')
			]);
			const [x, y] = project(vector, d.pca.mean, d.pca.components);
			const items = raw.words.map((w, i) => ({ word: w, vector: raw.vectors[i] }));
			added = [...added, { word, x, y, neighbors: nearest(vector, items, 5, new Set([word])) }];
			selected = word;
			newWord = '';
		} catch (error) {
			liveError = error instanceof Error ? error.message : String(error);
		}
	}
</script>

<WidgetFrame
	title="A map of meaning"
	source={model.status.state === 'ready'
		? { kind: 'live', model: MINILM.label }
		: { kind: 'recorded', model: MINILM.label }}
	onreset={() => {
		selected = 'cat';
		showAnalogy = false;
		added = [];
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const { sx, sy } = scales(d)}
			{@const all = [...d.words, ...added.map((a) => ({ ...a, group: 'yours' }))]}
			{@const current = all.find((w) => w.word === selected) ?? all[0]}
			{@const pos = (word: string) => all.find((w) => w.word === word)!}
			{@const k = pos('king')}
			{@const m = pos('man')}
			{@const wo = pos('woman')}
			{@const ax = k.x - m.x + wo.x}
			{@const ay = k.y - m.y + wo.y}
			{@const labels = visibleLabels(
				all,
				new Set([
					current.word,
					...current.neighbors.map((n) => n.word),
					...(showAnalogy ? ['king', 'man', 'woman', 'queen'] : []),
					...added.map((a) => a.word)
				]),
				sx,
				sy
			)}

			<div class="controls">
				<label class="label" for="{id}-word">Word</label>
				<select id="{id}-word" bind:value={selected}>
					{#each all
						.map((w) => w.word)
						.toSorted((a, b) => a.localeCompare(b)) as word (word)}<option value={word}
							>{word}</option
						>{/each}
				</select>
				<label class="check">
					<input type="checkbox" bind:checked={showAnalogy} /> Show king − man + woman
				</label>
			</div>

			<svg
				viewBox="0 0 {W} {H}"
				class="map"
				role="img"
				aria-label="Words placed by meaning. {current.word} is selected; its nearest neighbors are {current.neighbors
					.map((n) => n.word)
					.join(', ')}."
			>
				<defs>
					<marker
						id="{id}-arrow"
						viewBox="0 0 10 10"
						refX="9"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" class="arrowhead" />
					</marker>
				</defs>
				{#each current.neighbors as n (n.word)}
					{@const p = pos(n.word)}
					<line
						x1={sx(current.x)}
						y1={sy(current.y)}
						x2={sx(p.x)}
						y2={sy(p.y)}
						class="link"
						style:stroke-width={1 + n.similarity * 3}
					/>
				{/each}
				{#if showAnalogy}
					<line
						x1={sx(m.x)}
						y1={sy(m.y)}
						x2={sx(wo.x)}
						y2={sy(wo.y)}
						class="arrow"
						marker-end="url(#{id}-arrow)"
					/>
					<line
						x1={sx(k.x)}
						y1={sy(k.y)}
						x2={sx(ax)}
						y2={sy(ay)}
						class="arrow"
						marker-end="url(#{id}-arrow)"
					/>
					<circle cx={sx(ax)} cy={sy(ay)} r="7" class="target" />
				{/if}
				{#each all as w (w.word)}
					<g
						class="point"
						class:selected={w.word === current.word}
						class:neighbor={current.neighbors.some((n) => n.word === w.word)}
						class:analogy={showAnalogy && ['king', 'man', 'woman', 'queen'].includes(w.word)}
						class:yours={w.group === 'yours'}
						onclick={() => (selected = w.word)}
						role="presentation"
					>
						<title>{w.word}</title>
						<circle cx={sx(w.x)} cy={sy(w.y)} r={w.word === current.word ? 6 : 4} />
						{#if labels.has(w.word)}<text x={sx(w.x) + 7} y={sy(w.y) + 4}>{w.word}</text>{/if}
					</g>
				{/each}
			</svg>

			<div class="panel">
				<p>
					Nearest to <strong>{current.word}</strong>:
					{#each current.neighbors as n, i (n.word)}
						<button type="button" class="link-button" onclick={() => (selected = n.word)}
							>{n.word}</button
						>
						<span class="mono sim">{n.similarity.toFixed(2)}</span>{i < current.neighbors.length - 1
							? ', '
							: ''}
					{/each}
				</p>
				{#if showAnalogy}
					<p>
						<strong>king − man + woman</strong> lands closest to
						<strong>{d.analogy.nearest[0].word}</strong> ({d.analogy.nearest[0].similarity.toFixed(
							2
						)}), then {d.analogy.nearest
							.slice(1)
							.map((n) => n.word)
							.join(' and ')}, among the words on this map.
					</p>
				{/if}
				<p class="note">
					The map squashes {d.dimensions} numbers down to 2, so it keeps only about
					{Math.round((d.explainedVariance[0] + d.explainedVariance[1]) * 100)}% of the differences
					between words. Nearest neighbors (and the similarity scores, from −1 to 1) use all {d.dimensions}
					numbers.
				</p>
			</div>

			{#if !wantLive}
				<button type="button" onclick={() => (wantLive = true)}>Add your own words…</button>
			{:else}
				<ModelConsent
					{model}
					purpose="To place your own words on the map, a small embedding model has to run in your browser."
				/>
				{#if model.status.state === 'ready'}
					<form
						class="add"
						onsubmit={(e) => {
							e.preventDefault();
							addWord(d);
						}}
					>
						<label class="label" for="{id}-new">Your word</label>
						<input id="{id}-new" bind:value={newWord} autocomplete="off" />
						<button type="submit">Add to the map</button>
					</form>
					{#if liveError}<p class="error" role="alert">{liveError}</p>{/if}
				{/if}
			{/if}
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-2);
	}

	select,
	input:not([type]) {
		font: inherit;
		font-family: var(--font-mono);
		padding: 2px var(--space-2);
		background: var(--page);
		color: var(--ink);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}

	.check {
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.map {
		width: 100%;
		height: auto;
		font-family: var(--font-sans);
		font-size: 11px;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.point {
		cursor: pointer;
	}

	.point circle {
		fill: var(--c-vector);
		opacity: 0.55;
	}

	.point text {
		fill: var(--ink-muted);
		font-size: 9px;
		opacity: 0.6;
	}

	.point:hover text,
	.point.analogy text,
	.point.yours text {
		font-size: 12px;
		opacity: 1;
		fill: var(--ink);
	}

	.point.neighbor circle {
		opacity: 1;
	}

	.point.neighbor text {
		fill: var(--ink);
		font-size: 12px;
		opacity: 1;
	}

	.point.selected circle {
		opacity: 1;
		stroke: var(--ink);
		stroke-width: 2;
	}

	.point.selected text {
		fill: var(--ink);
		font-weight: 700;
		font-size: 13px;
		opacity: 1;
	}

	.point.yours circle {
		fill: var(--c-token);
		opacity: 1;
	}

	.link {
		stroke: var(--c-vector);
		stroke-opacity: 0.6;
	}

	.arrow {
		stroke: var(--c-attention);
		stroke-width: 2;
	}

	.arrowhead {
		fill: var(--c-attention);
	}

	.target {
		fill: none;
		stroke: var(--c-attention);
		stroke-width: 2;
		stroke-dasharray: 3 2;
	}

	.panel p {
		margin: var(--space-2) 0;
	}

	.sim {
		color: var(--c-vector-ink);
		font-size: 0.8rem;
	}

	.link-button {
		all: unset;
		cursor: pointer;
		color: var(--c-prob-ink);
		text-decoration: underline;
	}

	.link-button:focus-visible {
		outline: 2px solid var(--focus);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
	}

	.add {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.error {
		color: var(--c-loss-ink);
	}
</style>
