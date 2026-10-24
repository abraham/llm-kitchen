<script lang="ts">
	import { all, useDataset } from '#lib/datasets/use.ts';
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import Loading from '#lib/components/frame/Loading.svelte';
	import StepController from '#lib/components/frame/StepController.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import { scrollable } from '#lib/components/ui/scrollable.ts';
	import { Stepper } from '#lib/components/frame/stepper.svelte.ts';
	import ProbBars from '#lib/components/primitives/ProbBars.svelte';
	import TokenChip from '#lib/components/primitives/TokenChip.svelte';
	import VectorStrip from '#lib/components/primitives/VectorStrip.svelte';
	import { displayToken, formatPercent } from '#lib/components/primitives/format.ts';
	import type { Slug } from '#lib/curriculum/index.ts';
	import { STAGES, VARIANTS, type StageGroup } from './data.ts';
	import { segmentPrompt, type PromptPart } from '#lib/harness/agent.ts';

	import { canonical } from '#lib/models/provider.ts';

	const data = all([
		useDataset('agent/chat'),
		useDataset('traces/the-cat-sat'),
		useDataset('vectors/the-cat-sat'),
		useDataset('caching/kv-cache')
	]);

	const stepper = new Stepper(STAGES.length);
	const stage = $derived(STAGES[stepper.index]);
	const describe = (i: number) => `Stage ${i + 1} of ${STAGES.length}: ${STAGES[i].name}`;

	const GROUPS: { group: StageGroup; label: string }[] = [
		{ group: 'before', label: 'The harness' },
		{ group: 'model', label: 'The model' },
		{ group: 'after', label: 'The harness again' }
	];
	const LENS_BLOCKS = [1, 8, canonical.layers];

	const fmt = (n: number) => n.toLocaleString('en-US');
	const seconds = (ms: number) => `${Math.round(ms / 1000)} seconds`;

	/** Color scale: the 95th-percentile size, so a few huge numbers don't wash out the rest. */
	function typical(values: number[]): number {
		const sizes = values.map(Math.abs).sort((a, b) => a - b);
		return sizes[Math.floor(sizes.length * 0.95)];
	}

	/** The parts of `prompt` from character `from` on, keeping each part's color. */
	function partsFrom(prompt: string, from: number): PromptPart[] {
		let at = 0;
		return segmentPrompt(prompt).filter((p) => {
			const start = at;
			at += p.text.length;
			return start >= from;
		});
	}
</script>

{#snippet links(chapters: Slug[])}
	{#each chapters as slug, k (slug)}{k > 0 ? ', ' : ''}<ChapterRef to={slug} title />{/each}
{/snippet}

{#snippet promptText(parts: PromptPart[], label: string)}
	<pre class="raw" {@attach scrollable} aria-label={label}>{#each parts as p, i (i)}<span
				class={p.kind}>{p.text}</span
			>{/each}</pre>
{/snippet}

<WidgetFrame
	title="One message, start to finish"
	label="Step through"
	source={{ kind: 'recorded', model: 'Qwen2.5-1.5B-Instruct and GPT-2 small' }}
	onreset={() => stepper.reset()}
>
	<div class="map">
		<div class="agent-loop">
			<p class="loop-label">Agent loop (<ChapterRef to="the-agent-loop" />)</p>
			{#each GROUPS as g (g.group)}
				<div class="group {g.group}">
					<p class="group-label">
						{g.label}{#if g.group === 'model'}: a token loop (<ChapterRef to="generating-text" />),
							once per token until end-of-turn{/if}
					</p>
					<ol class="boxes">
						{#each STAGES as s, i (s.id)}
							{#if s.group === g.group}
								<li>
									<button
										type="button"
										aria-pressed={i === stepper.index}
										onclick={() => stepper.go(i)}
									>
										<span class="n mono">{i + 1}</span>
										{s.name}
									</button>
								</li>
							{/if}
						{/each}
					</ol>
					{#if g.group === 'model'}
						<p class="return">
							<span aria-hidden="true">↺</span> Next token: back to box 4
						</p>
					{/if}
				</div>
			{/each}
			<p class="return">
				<span aria-hidden="true">↺</span> After a tool runs: back to box 2
			</p>
		</div>
		<div class="variants">
			<p class="group-label">Other kinds of models swap one piece:</p>
			<ul>
				{#each VARIANTS as v (v.chapter)}
					<li><ChapterRef to={v.chapter} title />: {v.changes}</li>
				{/each}
			</ul>
		</div>
	</div>

	<div class="detail">
		<p class="stage-title">
			<span class="mono">{stepper.index + 1}</span>. {stage.name}
		</p>
		<p>{stage.what}</p>
		<Loading promise={data}>
			{#snippet children([run, trace, vectors, kv])}
				{@const [call1, call2] = run.steps}
				{@const last = trace.tokens.at(-1)!}
				{@const top = trace.steps[0].chosen}
				{@const topP = trace.steps[0].candidates[0].prob}
				{#if stage.group === 'model'}
					<p class="note">
						Inside the model, shown with {trace.modelDisplayName}’s recorded run on the last words
						of your message, “{trace.prompt}”.
					</p>
				{/if}
				<div class="example">
					{#if stage.id === 'message'}
						<ol class="chat" aria-label="The chat, as the app shows it">
							{#each run.history as m, i (i)}
								<li class={m.role}>{m.content}</li>
							{/each}
							<li class="user">{run.task}</li>
						</ol>
					{:else if stage.id === 'prompt'}
						{@render promptText(segmentPrompt(call1.prompt), 'The text sent to the model')}
						<p>
							Your {run.task.length}-character message is now a {fmt(call1.promptTokens)}-token
							prompt.
						</p>
					{:else if stage.id === 'cache'}
						<div class="bars" aria-hidden="true">
							<span>Call 1</span>
							<span class="bar"
								><span class="new" style:width="{(call1.promptTokens / call2.promptTokens) * 100}%"
								></span></span
							>
							<span>Call 2</span>
							<span class="bar"
								><span
									class="cached"
									style:width="{(call1.promptTokens / call2.promptTokens) * 100}%"
								></span><span
									class="new"
									style:width="{(1 - call1.promptTokens / call2.promptTokens) * 100}%"
								></span></span
							>
						</div>
						<p class="key" aria-hidden="true">
							<span class="swatch cached"></span>reused from the cache
							<span class="swatch new"></span>new work
						</p>
						<p>
							The model is called twice for this message. Call 2 ({fmt(call2.promptTokens)} tokens) starts
							with all {fmt(call1.promptTokens)} tokens of call 1, so only the last {fmt(
								call2.promptTokens - call1.promptTokens
							)} need new work. The system prompt and tool descriptions are the same for every message,
							so even call 1 starts with a familiar prefix.
						</p>
					{:else if stage.id === 'tokens'}
						<p class="chips">
							{#each trace.tokens as token, i (i)}<TokenChip {token} />{/each}
						</p>
						<p>{trace.tokens.length} tokens, each shown with its number.</p>
					{:else if stage.id === 'vectors'}
						<VectorStrip
							values={vectors.lastTokenByLayer[0]}
							label="{displayToken(last.text)}: word vector plus position vector"
						/>
						<p>
							The last token, <span class="mono">{displayToken(last.text)}</span>, as {fmt(
								vectors.dimensions
							)} numbers (the first few shown).
						</p>
					{:else if stage.id === 'blocks'}
						<VectorStrip
							values={vectors.lastTokenByLayer[canonical.layers]}
							scale={typical(vectors.lastTokenByLayer[canonical.layers])}
							label="{displayToken(last.text)} after block {canonical.layers}"
						/>
						<ul class="lens">
							{#each LENS_BLOCKS as b (b)}
								{@const guess = vectors.logitLens[b][0]}
								<li>
									Read after block {b}{b === canonical.layers ? ' (the last)' : ''}, its best guess
									is <span class="mono">{displayToken(guess.token.text)}</span>
								</li>
							{/each}
						</ul>
					{:else if stage.id === 'probabilities'}
						<ProbBars
							bars={trace.steps[0].candidates
								.slice(0, 5)
								.map((c) => ({ label: displayToken(c.token.text), p: c.prob }))}
							caption="Top 5 of {fmt(canonical.vocabularySize)} next tokens after “{trace.prompt}”"
						/>
					{:else if stage.id === 'pick'}
						<p class="chips">
							{#each trace.tokens as token, i (i)}<TokenChip
									{token}
									state="muted"
								/>{/each}<TokenChip token={top} state="new" />
						</p>
						<p>
							This run used temperature {trace.settings?.temperature ?? 0}, which always picks the
							top token: <span class="mono">{displayToken(top.text)}</span> at {formatPercent(
								topP
							)}.
						</p>
					{:else if stage.id === 'append'}
						{@const end = trace.steps.findIndex((s) => s.chosen.text.includes('.')) + 1}
						<p class="generated">
							{trace.prompt}<strong
								>{trace.steps
									.slice(0, end)
									.map((s) => s.chosen.text)
									.join('')}</strong
							>
						</p>
						<p>
							{end} loops, one token each. Writing {fmt(kv.generated.length)} tokens took
							{seconds(kv.totalMs.cache)} with the KV cache and {seconds(kv.totalMs.noCache)} without
							it.
						</p>
					{:else if stage.id === 'read'}
						{@render promptText(
							partsFrom(call2.prompt, call1.prompt.length).slice(0, 1),
							'What the model wrote'
						)}
						<p>
							{run.model.displayName} wrote a tool call, so the harness doesn’t show it. It runs the tool
							instead.
						</p>
					{:else if stage.id === 'tool'}
						{@render promptText(
							partsFrom(call2.prompt, call1.prompt.length),
							'What the harness added for call 2'
						)}
						<p>
							<span class="swatch result"></span>Untrusted: the tool result goes into the prompt as
							plain text. This harness runs every call without asking, which is safe for a search
							that only reads.
						</p>
					{:else if stage.id === 'context'}
						<p>
							This conversation is short: call 2 is {fmt(call2.promptTokens)} tokens. A long chat or a
							busy agent can outgrow the model’s window or the budget, and that is when the harness has
							to choose what to keep.
						</p>
					{:else if stage.id === 'reply'}
						<ol class="chat" aria-label="The reply, as the app shows it">
							<li class="user">{run.task}</li>
							<li class="assistant">{call2.thought}</li>
						</ol>
					{/if}
				</div>
			{/snippet}
		</Loading>
		<p class="read-more">Read more: {@render links(stage.chapters)}</p>
	</div>

	{#snippet controls()}
		<StepController {stepper} {describe} label="Stages" />
	{/snippet}
</WidgetFrame>

<style>
	.map {
		display: grid;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.agent-loop {
		border: 2px dashed var(--c-harness);
		border-radius: calc(var(--radius) * 2);
		padding: var(--space-3);
		display: grid;
		gap: var(--space-3);
	}

	.loop-label,
	.group-label {
		margin: 0 0 var(--space-2);
		font-weight: 600;
		color: var(--ink-muted);
	}

	.group.model {
		border: 2px solid var(--c-vector);
		border-radius: calc(var(--radius) * 2);
		padding: var(--space-3);
		background: var(--c-vector-tint);
	}

	.group.model .group-label,
	.group.model .return {
		color: var(--c-vector-ink);
	}

	.return {
		margin: var(--space-2) 0 0;
		font-weight: 600;
		color: var(--ink-muted);
	}

	.boxes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.boxes li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.boxes li + li::before {
		content: '→' / '';
		color: var(--ink-muted);
	}

	.boxes button {
		font: inherit;
		text-align: left;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}

	.boxes button[aria-pressed='true'] {
		border-color: var(--c-prob);
		background: var(--c-prob-tint);
		color: var(--c-prob-ink);
		font-weight: 600;
	}

	.n {
		color: var(--ink-muted);
	}

	@media (max-width: 40rem) {
		.boxes {
			flex-direction: column;
			align-items: stretch;
		}

		.boxes li {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-1);
		}

		.boxes li + li::before {
			content: '↓' / '';
			text-align: center;
		}
	}

	.variants ul {
		margin: 0;
		padding-left: var(--space-4);
	}

	.detail {
		margin-top: var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--rule);
	}

	.detail p {
		margin: 0 0 var(--space-2);
	}

	.stage-title {
		font-weight: 600;
	}

	.note,
	.read-more {
		font-size: 0.9rem;
		color: var(--ink-muted);
	}

	.example {
		min-height: 8rem;
	}

	.raw {
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.75rem;
		max-height: 14rem;
		overflow-y: auto;
		padding: var(--space-2);
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.marker {
		color: var(--c-token-ink);
	}

	.history {
		color: var(--ink-muted);
	}

	.system,
	.tools,
	.call {
		color: var(--c-harness-ink);
	}

	.call {
		font-weight: 700;
	}

	.message {
		font-weight: 700;
	}

	.result {
		background: var(--c-loss-tint);
		color: var(--c-loss-ink);
	}

	.swatch {
		display: inline-block;
		width: 0.8em;
		height: 0.8em;
		margin-right: var(--space-1);
		vertical-align: -0.05em;
	}

	.swatch.result {
		border: 1px solid var(--c-loss);
	}

	.swatch.new {
		background: var(--c-prob);
	}

	.swatch.cached {
		background: var(--c-vector);
		margin-left: 0;
	}

	.key {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.key .new {
		margin-left: var(--space-3);
	}

	.chat {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-2);
		display: grid;
		gap: var(--space-2);
		font-size: 0.9rem;
	}

	.chat li {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		white-space: pre-wrap;
		max-width: 85%;
	}

	.chat .user {
		justify-self: end;
		background: var(--c-prob-tint);
	}

	.chat .assistant {
		background: var(--surface-2);
	}

	.bars {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		margin-bottom: var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.bar {
		display: flex;
		height: 1rem;
	}

	.bar .new {
		background: var(--c-prob);
	}

	.bar .cached {
		background: var(--c-vector);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.lens {
		margin: var(--space-2) 0;
		padding-left: var(--space-4);
	}

	.generated strong {
		color: var(--c-vector-ink);
	}
</style>
