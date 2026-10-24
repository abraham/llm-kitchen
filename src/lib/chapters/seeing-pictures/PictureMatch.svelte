<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import { asset } from '$app/paths';
	import Loading from '#lib/components/layout/Loading.svelte';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';

	const data = useDataset('vision/clip');
	let caption = $state(0);
	const id = $props.id();
	const src = (file: string) => asset(file as Parameters<typeof asset>[0]);
	const label = (name: string) => name.replace('-', ' ');
</script>

<WidgetFrame
	title="Match words to pictures"
	source={{ kind: 'recorded', model: 'CLIP ViT-B/32' }}
	onreset={() => (caption = 0)}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const c = d.captions[caption]}
			{@const ranked = d.images
				.map((img, i) => ({ img, p: c.probability[i], sim: c.similarity[i] }))
				.sort((a, b) => b.p - a.p)}
			<div class="pick">
				<label for="{id}-cap" class="label">Words</label>
				<select id="{id}-cap" bind:value={caption}>
					{#each d.captions as option, i (option.text)}<option value={i}>{option.text}</option
						>{/each}
				</select>
			</div>
			<ol class="matches">
				{#each ranked as r, i (r.img.name)}
					<li class:best={i === 0}>
						<img src={src(r.img.file)} alt="A {label(r.img.name)}" width="64" height="64" />
						<span class="bar" aria-hidden="true"><span style:width="{r.p * 100}%"></span></span>
						<span class="mono pct">{formatPercent(r.p)}</span>
						<span class="mono sim">{r.sim.toFixed(2)}</span>
					</li>
				{/each}
			</ol>
			<p class="note">
				The percentages share 100% among these 12 pictures. The small number under each is the
				similarity of the two vectors, from −1 to 1. CLIP's similarities sit in a narrow band, so
				small differences decide the match. When nothing fits, like “a photo of a cat”, the
				percentages still add up to 100%, but even the best similarity is lower than for any of the
				exact descriptions.
			</p>
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

	.matches {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: var(--space-3);
	}

	li {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-1);
		border: 1px solid transparent;
		border-radius: var(--radius);
	}

	li.best {
		border: 2px solid var(--c-vector);
		background: var(--c-vector-tint);
	}

	img {
		width: 4rem;
		height: 4rem;
		border-radius: 2px;
	}

	.bar {
		width: 100%;
		height: 0.5rem;
		background: var(--c-prob-tint);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--c-prob);
		transition: width var(--duration) var(--ease);
	}

	.pct {
		font-size: 0.8rem;
	}

	.sim {
		font-size: 0.7rem;
		color: var(--ink-muted);
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-3) 0 0;
	}
</style>
