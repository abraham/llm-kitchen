<script lang="ts">
	import { useDataset } from '#lib/datasets/use.ts';
	import Loading from '#lib/components/frame/Loading.svelte';
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import Choice from '#lib/components/ui/Choice.svelte';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import { useProvider } from '#lib/models/live.svelte.ts';

	type Bar = { label: string; p: number };

	const SHOWN = 5;
	const BLANK = /_{2,}|\[mask\]/gi;
	const data = useDataset('encoders/fill-mask');
	const option = useProvider(['fill-mask', 'next-token'], 'BERT base and GPT-2 small');
	let index = $state(0);
	/** The visitor's own sentence, with `[MASK]` for the blank; live only. */
	let custom = $state<string | null>(null);
	let draft = $state('');
	let problem = $state('');
	let result = $state<{ sentence: string; bert: Bar[]; gpt2: Bar[] } | null>(null);
	let request = 0;
	const id = $props.id();

	const before = (sentence: string) => sentence.split('[MASK]')[0].trimEnd();
	const bar = (c: { text: string; p: number }): Bar => ({ label: c.text, p: c.p });

	async function run(sentence: string) {
		const bert = option.providerFor('fill-mask');
		const gpt2 = option.providerFor('next-token');
		if (!bert || !gpt2) return;
		const mine = ++request;
		problem = '';
		try {
			const [filled, next] = await Promise.all([
				bert.fillMask(sentence, { topK: SHOWN }),
				gpt2.nextTokenDistribution(before(sentence), { topK: SHOWN })
			]);
			if (mine !== request) return;
			const bars = (c: { token: { text: string }; prob: number }) => ({
				label: c.token.text,
				p: c.prob
			});
			result = { sentence, bert: filled.map(bars), gpt2: next.candidates.map(bars) };
		} catch (error) {
			if (mine === request) problem = error instanceof Error ? error.message : String(error);
		}
	}

	// Live, every sentence shown is asked of the models, the recorded ones too.
	$effect(() => {
		const live = option.live;
		const which = index;
		const mine = custom;
		if (live) void Promise.resolve(data).then((d) => run(mine ?? d.sentences[which].sentence));
	});

	function submit() {
		const blanks = draft.match(BLANK)?.length ?? 0;
		if (blanks !== 1) {
			problem = 'Put ___ where the blank goes, once.';
			return;
		}
		custom = draft.trim().replace(BLANK, '[MASK]');
	}
</script>

<WidgetFrame
	title="Fill in the blank"
	source={option.source}
	live={option}
	onreset={() => {
		index = 0;
		custom = null;
		draft = '';
		problem = '';
	}}
>
	<Loading promise={data}>
		{#snippet children(d)}
			{@const s = d.sentences[index]}
			{@const sentence = (option.live && custom) || s.sentence}
			{@const [head, tail] = sentence.split('[MASK]')}
			{@const fresh = !option.live || result?.sentence === sentence}
			{@const shown = option.live
				? result
				: { bert: s.bert.slice(0, SHOWN).map(bar), gpt2: s.gpt2.slice(0, SHOWN).map(bar) }}
			<Choice
				legend="Sentence"
				appearance="select"
				layout="inline"
				options={d.sentences.map((x, i) => ({
					value: i,
					label: x.sentence.replace('[MASK]', '___')
				}))}
				bind:value={() => index, (i) => ((index = i), (custom = null))}
			/>
			{#if option.live}
				<form
					class="custom"
					onsubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<label class="label" for="{id}-custom">Your own sentence</label>
					<input
						id="{id}-custom"
						type="text"
						bind:value={draft}
						placeholder="Use ___ for the blank"
						autocomplete="off"
					/>
					<button type="submit">Fill it in</button>
				</form>
			{/if}
			{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
			<p class="sentence">
				{head}<span class="blank"
					><span aria-hidden="true">___</span><span class="visually-hidden">blank</span></span
				>{tail}
			</p>
			<div class="grid" class:busy={!fresh}>
				<section aria-labelledby="{id}-gpt2">
					<h4 id="{id}-gpt2">{d.models.gpt2.displayName}</h4>
					<p class="reads">
						Reads only <q>{before(sentence)}</q>, the words before the blank.
					</p>
					<ProbBars
						bars={shown?.gpt2 ?? []}
						caption="{d.models.gpt2.displayName}'s top guesses for the next token"
					/>
				</section>
				<section aria-labelledby="{id}-bert">
					<h4 id="{id}-bert">{d.models.bert.displayName}</h4>
					<p class="reads">Reads the whole sentence, on both sides of the blank.</p>
					<ProbBars
						bars={shown?.bert ?? []}
						caption="{d.models.bert.displayName}'s top guesses for the blank"
					/>
				</section>
			</div>
		{/snippet}
	</Loading>
	<TierStatus
		{option}
		purpose="Type your own sentence with a blank, and BERT and GPT-2 guess it live."
	/>
</WidgetFrame>

<style>
	.custom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
	}

	.custom input {
		font: inherit;
		min-width: 16rem;
		flex: 1;
	}

	.problem {
		margin: var(--space-2) 0 0;
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.sentence {
		font-size: 1.15rem;
		margin: var(--space-3) 0;
	}

	.blank {
		display: inline-block;
		min-width: 3em;
		text-align: center;
		color: var(--c-token-ink);
		border-bottom: 2px solid var(--c-token);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: var(--space-4);
		transition: opacity var(--duration) var(--ease);
	}

	.grid.busy {
		opacity: 0.5;
	}

	h4 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	.reads {
		margin: var(--space-1) 0 var(--space-2);
		font-size: 0.875rem;
		color: var(--ink-muted);
	}
</style>
