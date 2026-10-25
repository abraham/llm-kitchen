<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadDataset } from '#lib/datasets/load.ts';
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import Figure from '#lib/components/ui/Figure.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import { nearest, project } from '#lib/math/vectors.ts';
	import { MINILM } from '#lib/models/browser-model.svelte.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';
	import type { EmbeddingMapData } from '#lib/datasets/parsers/embeddings.ts';

	const data = useDataset('embeddings/minilm-map');
	const option = useProvider('embed', MINILM.label);
	const id = $props.id();

	const TURN = 30;
	const TILT = 20;

	let selected = $state('cat');
	let showAnalogy = $state(false);
	let turn = $state(TURN);
	let tilt = $state(TILT);
	let newWord = $state('');
	let added = $state<
		{
			word: string;
			x: number;
			y: number;
			z: number;
			neighbors: { word: string; similarity: number }[];
		}[]
	>([]);
	let liveError = $state('');

	const MAX_W = 880;
	let W = $state(MAX_W);
	const H = 440;
	const PAD = 12;
	/** How far the camera sits from the middle, in units of the farthest word. */
	const DISTANCE = 8;

	type Point = { word: string; x: number; y: number; z: number };
	type Placed = { x: number; y: number; depth: number; size: number };

	/**
	 * A perspective view of the three directions: turned about the vertical axis, then tilted toward
	 * the reader. Turn 0° and tilt 0° looks straight down the third direction, at the first two.
	 */
	function camera(points: Point[], turnDeg: number, tiltDeg: number) {
		// Turn about the middle of the words' extent, scaled alike in every direction.
		const span = (k: 'x' | 'y' | 'z') => {
			const vs = points.map((p) => p[k]);
			return [Math.min(...vs), Math.max(...vs)] as const;
		};
		const [sx, sy, sz] = [span('x'), span('y'), span('z')];
		const mid = { x: (sx[0] + sx[1]) / 2, y: (sy[0] + sy[1]) / 2, z: (sz[0] + sz[1]) / 2 };
		const reach = Math.max(...points.map((p) => Math.hypot(p.x - mid.x, p.y - mid.y, p.z - mid.z)));
		const scale = ((Math.min(W, H) / 2 - PAD) * (DISTANCE - 1)) / DISTANCE;
		const [ct, st] = [Math.cos((turnDeg * Math.PI) / 180), Math.sin((turnDeg * Math.PI) / 180)];
		const [cp, sp] = [Math.cos((tiltDeg * Math.PI) / 180), Math.sin((tiltDeg * Math.PI) / 180)];
		/** A position in the data's units to the screen; the farthest word is 1 from the middle. */
		const place = (px: number, py: number, pz: number): Placed => {
			const [x, y, z] = [(px - mid.x) / reach, (py - mid.y) / reach, (pz - mid.z) / reach];
			const x1 = x * ct + z * st;
			const z1 = -x * st + z * ct;
			const y2 = y * cp - z1 * sp;
			const z2 = y * sp + z1 * cp;
			const size = DISTANCE / (DISTANCE - z2);
			return {
				x: W / 2 + scale * x1 * size,
				y: H / 2 - scale * y2 * size,
				depth: (z2 + 1) / 2,
				size
			};
		};
		// One line per direction through the middle, spanning the words; it never reaches past them.
		const axes = [
			[place(sx[0], mid.y, mid.z), place(sx[1], mid.y, mid.z)],
			[place(mid.x, sy[0], mid.z), place(mid.x, sy[1], mid.z)],
			[place(mid.x, mid.y, sz[0]), place(mid.x, mid.y, sz[1])]
		] as const;
		return {
			at: (p: Point) => place(p.x, p.y, p.z),
			axes
		};
	}

	/** Drag across the map to turn it, and up or down to tilt it; a drag never selects a word. */
	let dragged = false;
	const drag: Attachment<HTMLElement> = (element) => {
		let start: { x: number; y: number; turn: number; tilt: number; id: number } | undefined;
		const down = (e: PointerEvent) => {
			if (e.button !== 0) return;
			start = { x: e.clientX, y: e.clientY, turn, tilt, id: e.pointerId };
			dragged = false;
		};
		const move = (e: PointerEvent) => {
			if (!start) return;
			const [dx, dy] = [e.clientX - start.x, e.clientY - start.y];
			if (!dragged && Math.hypot(dx, dy) < 4) return;
			if (!dragged) element.setPointerCapture(start.id);
			dragged = true;
			turn = ((((start.turn + dx / 2 + 180) % 360) + 360) % 360) - 180;
			tilt = Math.max(-80, Math.min(80, start.tilt + dy / 2));
		};
		const up = () => {
			start = undefined;
			setTimeout(() => (dragged = false));
		};
		const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up };
		for (const [name, fn] of Object.entries(events)) {
			element.addEventListener(name, fn as EventListener);
		}
		return () => {
			for (const [name, fn] of Object.entries(events)) {
				element.removeEventListener(name, fn as EventListener);
			}
		};
	};

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
		fontSize: (word: string) => number
	): Record<string, Label> {
		const order = [...points].sort((a, b) => fontSize(b.word) - fontSize(a.word));
		// Keep other labels well clear of highlighted dots so no label looks like it belongs to them.
		const dots = points.map((p) => {
			const r = important.has(p.word) ? 10 : 5;
			return { word: p.word, box: { x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r } };
		});
		const labels: Box[] = [];
		const placed: Record<string, Label> = {};
		for (const p of order) {
			const size = fontSize(p.word);
			const [cx, cy] = [p.x, p.y];
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
		const live = option.provider;
		if (!word || !live || added.some((a) => a.word === word)) return;
		liveError = '';
		try {
			const [[vector], raw] = await Promise.all([
				live.embed([word]),
				loadDataset('embeddings/minilm-vectors')
			]);
			const [x, y, z] = project(vector, d.pca.mean, d.pca.components);
			const items = raw.words.map((w, i) => ({ word: w, vector: raw.vectors[i] }));
			added = [...added, { word, x, y, z, neighbors: nearest(vector, items, 5, new Set([word])) }];
			selected = word;
			newWord = '';
		} catch (error) {
			liveError = error instanceof Error ? error.message : String(error);
		}
	}
</script>

<WidgetFrame
	title="A map of meaning"
	source={option.source}
	live={option}
	onreset={() => {
		selected = 'cat';
		showAnalogy = false;
		turn = TURN;
		tilt = TILT;
		added = [];
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const all = [
				...d.words,
				...(option.live ? added : []).map((a) => ({ ...a, group: 'yours' }))
			]}
			{@const view = camera(all, turn, tilt)}
			{@const screen = new Map(all.map((w) => [w.word, view.at(w)]))}
			{@const at = (word: string) => screen.get(word)!}
			{@const current = all.find((w) => w.word === selected) ?? all[0]}
			{@const result = d.analogy.nearest[0].word}
			{@const important = new Set([
				current.word,
				...current.neighbors.map((n) => n.word),
				...(showAnalogy ? ['king', 'man', 'woman', result] : []),
				...added.map((a) => a.word)
			])}
			{@const labels = placeLabels(
				all.map((w) => ({ word: w.word, ...at(w.word) })),
				important,
				(word) => (word === current.word ? 13 : important.has(word) ? 12 : 11)
			)}
			{@const byDepth = all.toSorted((a, b) => at(a.word).depth - at(b.word).depth)}

			<div class="controls">
				<Choice
					legend="Word"
					appearance="select"
					layout="inline"
					options={all
						.map((w) => w.word)
						.toSorted((a, b) => a.localeCompare(b))
						.map((word) => ({ value: word, label: word }))}
					bind:value={selected}
				/>
				<Toggle label="Show king − man + woman" bind:checked={showAnalogy} />
			</div>

			<div class="map" {@attach drag}>
				<Figure
					max={MAX_W}
					bind:width={W}
					height={H}
					label="Words placed by meaning in three directions, turned {turn}° and tilted {tilt}°. {current.word} is selected; its nearest neighbors are {current.neighbors
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
					{#each view.axes as [a, b], i (i)}
						<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="frame" />
					{/each}
					{#each current.neighbors as n (n.word)}
						{@const [a, b] = [at(current.word), at(n.word)]}
						<line
							x1={a.x}
							y1={a.y}
							x2={b.x}
							y2={b.y}
							class="link"
							style:stroke-width={1 + n.similarity * 3}
						/>
					{/each}
					{#if showAnalogy}
						{#each [['man', 'woman'], ['king', result]] as [from, to] (from)}
							{@const [a, b] = [at(from), at(to)]}
							<line
								x1={a.x}
								y1={a.y}
								x2={b.x}
								y2={b.y}
								class="arrow"
								marker-end="url(#{id}-arrow)"
							/>
						{/each}
					{/if}
					{#each byDepth as w (w.word)}
						{@const p = at(w.word)}
						<g
							class="point"
							class:selected={w.word === current.word}
							class:neighbor={current.neighbors.some((n) => n.word === w.word)}
							class:analogy={showAnalogy && ['king', 'man', 'woman', result].includes(w.word)}
							class:yours={w.group === 'yours'}
							style:--near={p.depth.toFixed(2)}
							onclick={() => {
								if (!dragged) selected = w.word;
							}}
							role="presentation"
						>
							<title>{w.word}</title>
							<circle cx={p.x} cy={p.y} r={(w.word === current.word ? 6 : 4) * p.size} />
							{#if labels[w.word]}
								{@const l = labels[w.word]}
								{#if l.leader}
									<line class="leader" x1={p.x} y1={p.y} x2={l.leader.x} y2={l.leader.y} />
								{/if}
								<text x={l.x} y={l.y} text-anchor={l.anchor}>{w.word}</text>
							{/if}
						</g>
					{/each}
				</Figure>
			</div>

			<div class="turn">
				<Slider
					label="Turn"
					layout="inline"
					concept="vector"
					min={-180}
					max={180}
					step={5}
					width={5}
					format={(v) => `${Math.round(v)}°`}
					bind:value={turn}
				/>
				<Slider
					label="Tilt"
					layout="inline"
					concept="vector"
					min={-80}
					max={80}
					step={5}
					width={4}
					format={(v) => `${Math.round(v)}°`}
					bind:value={tilt}
				/>
			</div>

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
						<i>man</i> → <i>woman</i> and <i>king</i> → <i>{result}</i>. They point only partly the
						same way: about 75° apart in all {d.dimensions} numbers, where parallel would be 0°. That’s
						still closer than most steps between these words, and enough for the sum to land there. On
						the map, their angle changes as you turn it.
					</p>
				{/if}
				<p class="note">
					Drag the map or use the sliders to turn it. It squashes {d.dimensions} numbers down to
					{d.explainedVariance.length}, so it keeps only about
					{Math.round(d.explainedVariance.reduce((a, b) => a + b, 0) * 100)}% of the differences
					between words. Nearest neighbors (and the similarity scores, from −1 to 1) use all {d.dimensions}
					numbers.
				</p>
			</div>

			{#if option.live}
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
			<TierStatus
				{option}
				purpose="To place your own words on the map, a small embedding model has to run in your browser."
			/>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.controls {
		--block-space: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-2);
	}

	input:not([type]) {
		font: inherit;
		font-family: var(--font-mono);
		padding: 2px var(--space-2);
		background: var(--page);
		color: var(--ink);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}

	.map {
		font-size: 11px;
		background: var(--surface-2);
		border-radius: var(--radius);
		cursor: grab;
		/* Sideways drags turn the map; vertical swipes still scroll the page. */
		touch-action: pan-y;
		user-select: none;
	}

	.map:active {
		cursor: grabbing;
	}

	.turn {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		margin-top: var(--space-2);
	}

	.frame {
		stroke: var(--rule);
		stroke-width: 1;
	}

	.point {
		cursor: pointer;
	}

	.point circle {
		fill: var(--c-vector);
		opacity: calc(0.25 + 0.55 * var(--near));
	}

	.leader {
		stroke: var(--ink-muted);
		stroke-width: 1;
	}

	.point text {
		fill: var(--ink-muted);
		font-size: 11px;
		opacity: calc(0.45 + 0.45 * var(--near));
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
