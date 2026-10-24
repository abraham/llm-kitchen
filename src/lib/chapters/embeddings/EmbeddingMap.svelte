<script lang="ts">
	import { loadDataset } from '#lib/datasets/load.ts';
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import ModelConsent from '#lib/components/frame/ModelConsent.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { nearest, project } from '#lib/math/vectors.ts';
	import { MINILM, browserModel } from '#lib/models/browser-model.svelte.ts';
	import { BrowserProvider } from '#lib/models/browser-provider.ts';
	import type { EmbeddingMapData } from '#lib/datasets/parsers/embeddings.ts';

	const data = useDataset('embeddings/minilm-map');
	const model = browserModel(MINILM);
	const liveProvider = new BrowserProvider(model);
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

	type Label = {
		x: number;
		y: number;
		anchor: 'start' | 'end' | 'middle';
		leader?: { x: number; y: number };
	};
	type Box = { x: number; y: number; w: number; h: number };

	const overlap = (a: Box, b: Box) =>
		Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
		Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

	/**
	 * Where each word's label goes: the spot around its dot that covers the least of other labels and dots.
	 * Important words always get a label, if need be a little way off with a leader line; others only if
	 * a spot right next to their dot is free.
	 */
	function placeLabels(
		points: { word: string; x: number; y: number }[],
		important: Set<string>,
		fontSize: (word: string) => number,
		sx: (x: number) => number,
		sy: (y: number) => number
	): Record<string, Label> {
		const order = [...points].sort((a, b) => fontSize(b.word) - fontSize(a.word));
		// Keep other labels well clear of highlighted dots so no label looks like it belongs to them.
		const dots = points.map((p) => {
			const r = important.has(p.word) ? 10 : 5;
			return { word: p.word, box: { x: sx(p.x) - r, y: sy(p.y) - r, w: 2 * r, h: 2 * r } };
		});
		const labels: Box[] = [];
		const placed: Record<string, Label> = {};
		for (const p of order) {
			const size = fontSize(p.word);
			const [cx, cy] = [sx(p.x), sy(p.y)];
			const w = p.word.length * size * 0.6;
			const h = size;
			const gap = 7;
			const at = (x: number, y: number, anchor: Label['anchor']) => {
				const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
				return { x, y: y + h * 0.8, anchor, box: { x: left, y, w, h } };
			};
			// Spots right next to the dot, then (important words only) farther out with a leader line.
			const rings = important.has(p.word) ? [gap, gap * 3] : [gap];
			const options = rings.flatMap((g) => [
				at(cx + g, cy - h / 2, 'start'),
				at(cx - g, cy - h / 2, 'end'),
				at(cx, cy - g - h, 'middle'),
				at(cx, cy + g, 'middle'),
				at(cx + g - 2, cy - g - h + 2, 'start'),
				at(cx + g - 2, cy + g - 2, 'start'),
				at(cx - g + 2, cy - g - h + 2, 'end'),
				at(cx - g + 2, cy + g - 2, 'end')
			]);
			const offMap = (box: Box) =>
				box.x < 0 || box.y < 0 || box.x + box.w > W || box.y + box.h > H ? 1e6 : 0;
			const crowding = (box: Box) =>
				offMap(box) +
				labels.reduce((a, b) => a + overlap(box, b), 0) +
				dots.reduce((a, d) => a + (d.word === p.word ? 0 : overlap(box, d.box)), 0);
			const scored = options.map((o, i) => ({
				o,
				far: i >= 8,
				c: crowding(o.box) + (i >= 8 ? 20 : 0)
			}));
			const best = scored.reduce((a, b) => (b.c < a.c ? b : a));
			if (best.c === 0 || important.has(p.word)) {
				const { box } = best.o;
				labels.push(box);
				placed[p.word] = {
					x: best.o.x,
					y: best.o.y,
					anchor: best.o.anchor,
					leader: best.far
						? {
								x: Math.min(Math.max(cx, box.x), box.x + box.w),
								y: Math.min(Math.max(cy, box.y), box.y + box.h)
							}
						: undefined
				};
			}
		}
		return placed;
	}

	async function addWord(d: EmbeddingMapData) {
		const word = newWord.trim().toLowerCase();
		if (!word || added.some((a) => a.word === word)) return;
		liveError = '';
		try {
			const [[vector], raw] = await Promise.all([
				liveProvider.embed([word]),
				loadDataset('embeddings/minilm-vectors')
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
			{@const result = pos(d.analogy.nearest[0].word)}
			{@const important = new Set([
				current.word,
				...current.neighbors.map((n) => n.word),
				...(showAnalogy ? ['king', 'man', 'woman', result.word] : []),
				...added.map((a) => a.word)
			])}
			{@const labels = placeLabels(
				all,
				important,
				(word) => (word === current.word ? 13 : important.has(word) ? 12 : 9),
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
						x2={sx(result.x)}
						y2={sy(result.y)}
						class="arrow"
						marker-end="url(#{id}-arrow)"
					/>
				{/if}
				{#each all as w (w.word)}
					<g
						class="point"
						class:selected={w.word === current.word}
						class:neighbor={current.neighbors.some((n) => n.word === w.word)}
						class:analogy={showAnalogy && ['king', 'man', 'woman', result.word].includes(w.word)}
						class:yours={w.group === 'yours'}
						onclick={() => (selected = w.word)}
						role="presentation"
					>
						<title>{w.word}</title>
						<circle cx={sx(w.x)} cy={sy(w.y)} r={w.word === current.word ? 6 : 4} />
						{#if labels[w.word]}
							{@const l = labels[w.word]}
							{#if l.leader}
								<line class="leader" x1={sx(w.x)} y1={sy(w.y)} x2={l.leader.x} y2={l.leader.y} />
							{/if}
							<text x={l.x} y={l.y} text-anchor={l.anchor}>{w.word}</text>
						{/if}
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
							.join(' and ')}, among the words on this map. The arrows show the two steps,
						<i>man</i> → <i>woman</i> and <i>king</i> → <i>{result.word}</i>. In all
						{d.dimensions} numbers they partly line up, which is why the sum lands there; squashed onto
						this flat map, they don’t look alike.
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

	.leader {
		stroke: var(--ink-muted);
		stroke-width: 1;
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
