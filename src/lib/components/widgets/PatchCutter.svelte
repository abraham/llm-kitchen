<script module lang="ts">
	export interface ClipData {
		model: { displayName: string };
		imageSize: number;
		patchSize: number;
		grid: number;
		patchDimensions: number;
		embeddingDimensions: number;
		images: { name: string; file: string; patches: number[][] }[];
		captions: { text: string; similarity: number[]; probability: number[] }[];
	}
</script>

<script lang="ts">
	import { asset } from '$app/paths';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { loadJson } from '#lib/models/load-json.ts';

	const data = loadJson<ClipData>('vision/clip.json');
	let image = $state(0);
	let patch = $state(24);
	const id = $props.id();
	const src = (file: string) => asset(file as Parameters<typeof asset>[0]);
	const label = (name: string) => name.replace('-', ' ');

	function pick(e: MouseEvent & { currentTarget: HTMLElement }, grid: number) {
		const r = e.currentTarget.getBoundingClientRect();
		const col = Math.min(grid - 1, Math.floor(((e.clientX - r.left) / r.width) * grid));
		const row = Math.min(grid - 1, Math.floor(((e.clientY - r.top) / r.height) * grid));
		patch = row * grid + col;
	}
</script>

<WidgetFrame
	title="Cut a picture into tokens"
	source={{ kind: 'recorded', model: 'CLIP ViT-B/32' }}
	onreset={() => {
		image = 0;
		patch = 24;
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const img = d.images[image]}
			{@const g = d.grid}
			{@const same = img.patches.filter((p) => p.join() === img.patches[patch].join()).length}
			<div class="pick">
				<label for="{id}-img" class="label">Picture</label>
				<select id="{id}-img" bind:value={image}>
					{#each d.images as option, i (option.name)}<option value={i}>{label(option.name)}</option
						>{/each}
				</select>
			</div>
			<div class="layout">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="picture" style:--g={g} onclick={(e) => pick(e, g)}>
					<img
						src={src(img.file)}
						alt="A {label(img.name)}"
						width={d.imageSize}
						height={d.imageSize}
					/>
					<div class="lines" aria-hidden="true">
						{#each Array.from({ length: g * g }, (_, i) => i) as i (i)}
							<span class:here={i === patch}></span>
						{/each}
					</div>
				</div>
				<div>
					<div class="slider">
						<label for="{id}-patch" class="label"
							>Patch <span class="mono" aria-hidden="true">{patch + 1} of {g * g}</span></label
						>
						<input id="{id}-patch" type="range" min="0" max={g * g - 1} bind:value={patch} />
					</div>
					<p class="label">The patches in reading order, like a sentence of tokens</p>
					<ol class="row" aria-label="All {g * g} patches in order">
						{#each Array.from({ length: g * g }, (_, i) => i) as i (i)}
							<li
								class:here={i === patch}
								style:background-image="url({src(img.file)})"
								style:background-position="{((i % g) / (g - 1)) * 100}% {(Math.floor(i / g) /
									(g - 1)) *
									100}%"
								style:background-size="{g * 100}%"
							>
								<span class="visually-hidden">Patch {i + 1}</span>
							</li>
						{/each}
					</ol>
					<p class="label">Patch {patch + 1} as a vector</p>
					<VectorStrip
						values={img.patches[patch]}
						cells={img.patches[patch].length}
						label="Patch {patch + 1}'s first {img.patches[patch].length} numbers"
					/>
					<p class="readout" aria-live="polite">
						Each {d.patchSize}×{d.patchSize}-pixel patch becomes a vector of {d.patchDimensions} numbers
						(the first {img.patches[patch].length} shown).
						{#if same > 1}This patch looks exactly like {same - 1} others, so they all get the same vector.{/if}
					</p>
				</div>
			</div>
		{/snippet}
	</Loading>
</WidgetFrame>

<style>
	.pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	select {
		font: inherit;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
		gap: var(--space-4);
		align-items: start;
	}

	@media (max-width: 40rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.picture {
		position: relative;
		width: 100%;
		max-width: 14rem;
		aspect-ratio: 1;
		cursor: crosshair;
	}

	.picture img {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 2px;
	}

	.lines {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(var(--g), 1fr);
	}

	.lines span {
		border: 0.5px solid color-mix(in oklch, var(--ink) 25%, transparent);
	}

	.lines span.here {
		border: 2.5px solid var(--c-token);
	}

	.slider {
		display: flex;
		flex-direction: column;
		max-width: 20rem;
		margin-bottom: var(--space-3);
	}

	input[type='range'] {
		accent-color: var(--c-token);
	}

	.row {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.row li {
		width: 16px;
		height: 16px;
		border: 1px solid var(--rule);
	}

	.row li.here {
		outline: 2px solid var(--c-token);
		outline-offset: 1px;
	}

	.readout {
		margin: var(--space-3) 0 0;
		min-height: 3em;
		font-size: 0.95rem;
	}
</style>
