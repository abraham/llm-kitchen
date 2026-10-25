<script lang="ts">
	import { loadDataset } from '#lib/datasets/load.ts';
	import { useDataset } from '#lib/datasets/use.ts';
	import { asset } from '$app/paths';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import { formatPercent } from '#lib/components/primitives/format.ts';
	import { matchPictures } from '#lib/math/vectors.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';

	type Scores = { similarity: number[]; probability: number[] };

	const data = useDataset('vision/clip');
	const option = useProvider('image-text', 'CLIP ViT-B/32');
	let caption = $state(0);
	/** The visitor's own captions, scored live. */
	let extra = $state<string[]>([]);
	let draft = $state('');
	let problem = $state('');
	/** Live scores by caption text, in the recording's picture order. */
	let scores = $state<Record<string, Scores>>({});
	const id = $props.id();
	const src = (file: string) => asset(file as Parameters<typeof asset>[0]);
	const label = (name: string) => name.replace('-', ' ');

	async function score(texts: string[]) {
		const provider = option.provider;
		const missing = texts.filter((t) => !(t in scores));
		if (!provider?.embedText || !missing.length) return;
		problem = '';
		try {
			const [vectors, pictures, d] = await Promise.all([
				provider.embedText(missing),
				loadDataset('vision/clip-images'),
				Promise.resolve(data)
			]);
			const embeddings = d.images.map(
				(img) => pictures.images.find((p) => p.name === img.name)!.embedding
			);
			const next = { ...scores };
			missing.forEach((text, i) => {
				next[text] = matchPictures(vectors[i], embeddings, pictures.logitScale);
			});
			scores = next;
		} catch (error) {
			problem = error instanceof Error ? error.message : String(error);
		}
	}

	// Live, every caption is scored by the model in this browser, the recorded ones too.
	$effect(() => {
		if (option.live) void Promise.resolve(data).then((d) => score(d.captions.map((c) => c.text)));
	});

	function submit() {
		const text = draft.trim();
		if (!text) return;
		void Promise.resolve(data).then((d) => {
			const texts = [...d.captions.map((c) => c.text), ...extra];
			if (!texts.includes(text)) extra = [...extra, text];
			caption = [...d.captions.map((c) => c.text), ...extra].indexOf(text);
			draft = '';
			void score([text]);
		});
	}
</script>

<WidgetFrame
	title="Match words to pictures"
	source={option.source}
	live={option}
	onreset={() => {
		caption = 0;
		extra = [];
		draft = '';
		problem = '';
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const texts = [...d.captions.map((x) => x.text), ...(option.live ? extra : [])]}
			{@const text = texts[caption] ?? texts[0]}
			{@const c = option.live ? scores[text] : d.captions.find((x) => x.text === text)}
			{@const ranked = c
				? d.images
						.map((img, i) => ({ img, p: c.probability[i], sim: c.similarity[i] }))
						.sort((a, b) => b.p - a.p)
				: d.images.map((img) => ({ img, p: 0, sim: 0 }))}
			<Choice
				legend="Words"
				appearance="select"
				layout="inline"
				options={texts.map((t, i) => ({ value: i, label: t }))}
				bind:value={() => (texts[caption] ? caption : 0), (i) => (caption = i)}
			/>
			{#if option.live}
				<form
					class="custom"
					onsubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<label class="label" for="{id}-custom">Your own words</label>
					<input
						id="{id}-custom"
						type="text"
						bind:value={draft}
						placeholder="Describe a picture…"
						autocomplete="off"
					/>
					<button type="submit">Match them</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			<ol class="matches" class:busy={!c}>
				{#each ranked as r, i (r.img.name)}
					<li class:best={c && i === 0}>
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
	<TierStatus
		{option}
		purpose="Type your own words and CLIP's text half, running live, matches them to the pictures."
	/>
</WidgetFrame>

<style>
	.custom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
	}

	.custom input {
		font: inherit;
		min-width: 14rem;
		flex: 1;
	}

	.problem {
		margin: 0 0 var(--space-2);
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.matches {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: var(--space-3);
		transition: opacity var(--duration) var(--ease);
	}

	.matches.busy {
		opacity: 0.5;
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
