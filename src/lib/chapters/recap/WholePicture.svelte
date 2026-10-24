<script lang="ts">
	import ChapterRef from '#lib/components/page/ChapterRef.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import type { Slug } from '#lib/curriculum/index.ts';
	import { canonical } from '#lib/models/provider.ts';

	interface Part {
		id: string;
		name: string;
		what: string;
		chapters: Slug[];
		color: string;
		children?: string[];
	}

	const PARTS: Record<string, Part> = {
		app: {
			id: 'app',
			name: 'A chat app or agent',
			what: 'Everything you interact with.',
			chapters: ['the-model-is-not-the-product'],
			color: 'harness',
			children: ['you', 'harness', 'model']
		},
		you: {
			id: 'you',
			name: 'You',
			what: 'You type a message and read the reply. Your words are the start of the document the model continues.',
			chapters: ['prompts-as-documents', 'the-model-is-not-the-product'],
			color: 'prob',
			children: ['wording', 'examples', 'instructions', 'steps', 'fragile']
		},
		wording: {
			id: 'wording',
			name: 'Wording',
			what: 'Every word shifts the next-token probabilities.',
			chapters: ['prompts-as-documents'],
			color: 'token'
		},
		examples: {
			id: 'examples',
			name: 'Examples',
			what: 'A few examples in the prompt can teach a task, with no change to the weights.',
			chapters: ['few-shot'],
			color: 'attention'
		},
		instructions: {
			id: 'instructions',
			name: 'Instructions and roles',
			what: 'Specific instructions help; a persona changes style, not ability.',
			chapters: ['instructions-and-roles'],
			color: 'harness'
		},
		steps: {
			id: 'steps',
			name: 'Steps and formats',
			what: 'Working written out first; a fixed format for programs to read.',
			chapters: ['steps-and-structure'],
			color: 'prob'
		},
		fragile: {
			id: 'fragile',
			name: 'Fragile prompts',
			what: 'Order, layout, and position can change the answer: test variants.',
			chapters: ['where-prompts-break'],
			color: 'loss'
		},
		harness: {
			id: 'harness',
			name: 'The harness',
			what: 'Ordinary code that builds the prompt, picks a model, calls it in a loop, runs tools, and decides what the model gets to see.',
			chapters: ['the-model-is-not-the-product', 'the-agent-loop'],
			color: 'harness',
			children: ['template', 'context', 'cache', 'route', 'tools', 'loop', 'guards']
		},
		template: {
			id: 'template',
			name: 'Prompt and chat template',
			what: 'Turns the conversation, system prompt, and tool list into one text.',
			chapters: ['predictor-to-assistant', 'the-model-is-not-the-product'],
			color: 'token'
		},
		tools: {
			id: 'tools',
			name: 'Tools',
			what: 'Code the harness runs when the model writes a tool call.',
			chapters: ['tools'],
			color: 'harness'
		},
		loop: {
			id: 'loop',
			name: 'Agent loop',
			what: 'Call the model, run its tool calls, add the results, call again, until an answer or a limit.',
			chapters: ['the-agent-loop'],
			color: 'harness'
		},
		context: {
			id: 'context',
			name: 'Context management',
			what: 'Drops, summarizes, or retrieves text so it fits the window.',
			chapters: ['the-context-problem', 'managing-the-context'],
			color: 'weight'
		},
		cache: {
			id: 'cache',
			name: 'Prompt cache',
			what: 'Reuses the work on a prompt’s unchanged start, so long conversations stay cheap and fast.',
			chapters: ['caching'],
			color: 'vector'
		},
		route: {
			id: 'route',
			name: 'Routing',
			what: 'Picks which model answers: a cheap one first, and a bigger one when it is unsure.',
			chapters: ['routing'],
			color: 'prob'
		},
		guards: {
			id: 'guards',
			name: 'Guardrails',
			what: 'Text the model reads can carry instructions, so permission prompts, tool allowlists, sandboxes, and step limits cap the damage.',
			chapters: ['prompt-injection', 'trust-and-guardrails'],
			color: 'loss'
		},
		model: {
			id: 'model',
			name: 'The model',
			what: 'Turns text into probabilities for the next token, one token at a time.',
			chapters: ['guessing-game', 'generating-text'],
			color: 'prob',
			children: ['tokens', 'vectors', 'blocks', 'probs', 'pick', 'bits', 'reasoning', 'variants']
		},
		tokens: {
			id: 'tokens',
			name: 'Tokens',
			what: 'Text becomes numbers, in pieces from a fixed vocabulary.',
			chapters: ['text-is-numbers', 'tokens'],
			color: 'token'
		},
		vectors: {
			id: 'vectors',
			name: 'Embeddings',
			what: 'Each token becomes a list of numbers, plus its position.',
			chapters: ['embeddings'],
			color: 'vector'
		},
		blocks: {
			id: 'blocks',
			name: `${canonical.layers} transformer blocks`,
			what: 'Each block refines every token’s vector.',
			chapters: ['the-transformer-block'],
			color: 'attention',
			children: ['attention', 'mlp', 'stream']
		},
		attention: {
			id: 'attention',
			name: 'Attention',
			what: 'Each token gathers information from earlier tokens.',
			chapters: ['the-context-problem', 'attention'],
			color: 'attention'
		},
		mlp: {
			id: 'mlp',
			name: 'MLP',
			what: 'Layers of neurons with learned weights.',
			chapters: ['a-neuron'],
			color: 'weight'
		},
		stream: {
			id: 'stream',
			name: 'Residual stream and layer norm',
			what: 'Each step adds to a running vector.',
			chapters: ['the-transformer-block'],
			color: 'vector'
		},
		probs: {
			id: 'probs',
			name: 'Probabilities',
			what: 'A score for every token, turned into chances with softmax.',
			chapters: ['predicting-by-counting', 'probability-and-sampling'],
			color: 'prob'
		},
		pick: {
			id: 'pick',
			name: 'Pick and append',
			what: 'Sample a token, add it, and repeat. A small drafter can guess ahead for the model to check.',
			chapters: ['probability-and-sampling', 'generating-text', 'speculative-decoding'],
			color: 'prob'
		},
		bits: {
			id: 'bits',
			name: 'Bits per weight',
			what: 'The weights can be rounded to fewer bits, so the model takes less memory.',
			chapters: ['quantization'],
			color: 'weight'
		},
		variants: {
			id: 'variants',
			name: 'Other kinds of models',
			what: 'The same pieces, with one of them changed.',
			chapters: ['encoders'],
			color: 'weight',
			children: ['encoders', 'experts', 'recurrent', 'vision', 'diffusion']
		},
		encoders: {
			id: 'encoders',
			name: 'Encoders',
			what: 'Attention that looks both ways, for understanding rather than writing.',
			chapters: ['encoders'],
			color: 'attention'
		},
		experts: {
			id: 'experts',
			name: 'Mixture of experts',
			what: 'Many MLPs per block; a router sends each token to a few.',
			chapters: ['mixture-of-experts'],
			color: 'weight'
		},
		recurrent: {
			id: 'recurrent',
			name: 'Recurrent models',
			what: 'A fixed-size memory instead of looking back at every token.',
			chapters: ['recurrent-models'],
			color: 'vector'
		},
		vision: {
			id: 'vision',
			name: 'Vision models',
			what: 'Patches of a picture become the tokens.',
			chapters: ['seeing-pictures'],
			color: 'token'
		},
		diffusion: {
			id: 'diffusion',
			name: 'Diffusion models',
			what: 'Make a picture by removing noise, a little at every step.',
			chapters: ['diffusion'],
			color: 'weight'
		},
		reasoning: {
			id: 'reasoning',
			name: 'Reasoning models',
			what: 'The same model, tuned to write scratch work before the answer.',
			chapters: ['reasoning-models'],
			color: 'prob'
		}
	};

	let path = $state<string[]>(['app']);
	const current = $derived(PARTS[path.at(-1)!]);
</script>

<WidgetFrame
	title="The whole picture"
	source={{ kind: 'computed' }}
	onreset={() => (path = ['app'])}
>
	<nav class="crumbs" aria-label="Zoom level">
		{#each path as p, i (p)}
			{#if i < path.length - 1}
				<button type="button" class="crumb" onclick={() => (path = path.slice(0, i + 1))}
					>{PARTS[p].name}</button
				>
				<span aria-hidden="true">›</span>
			{:else}
				<span class="crumb here" aria-current="location">{PARTS[p].name}</span>
			{/if}
		{/each}
	</nav>

	<p class="what">{current.what}</p>
	<ul class="boxes">
		{#each current.children ?? [] as c (c)}
			{@const part = PARTS[c]}
			<li style:--c="var(--c-{part.color})" style:--t="var(--c-{part.color}-tint)">
				<h4>{part.name}</h4>
				<p>{part.what}</p>
				<p class="links">
					{#each part.chapters as slug (slug)}
						<ChapterRef to={slug} title />
					{/each}
				</p>
				{#if part.children}
					<button type="button" onclick={() => (path = [...path, c])}
						>Zoom in on {part.name.toLowerCase()}</button
					>
				{/if}
			</li>
		{/each}
	</ul>
</WidgetFrame>

<style>
	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		font-family: var(--font-sans);
		font-size: 0.85rem;
	}

	.crumb.here {
		font-weight: 700;
	}

	.what {
		margin: var(--space-2) 0 var(--space-3);
	}

	.boxes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: var(--space-3);
	}

	.boxes li {
		border: 1.5px solid var(--c);
		background: var(--t);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	h4 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.95rem;
	}

	.boxes p {
		margin: 0;
		font-size: 0.85rem;
	}

	.links {
		display: flex;
		flex-direction: column;
	}

	.links :global(a) {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		font-family: var(--font-sans);
		font-size: 0.8rem;
	}

	.boxes button {
		margin-top: auto;
		align-self: flex-start;
	}
</style>
