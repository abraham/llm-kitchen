<script lang="ts">
	import { resolve } from '$app/paths';
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { chapterByNumber } from '#lib/chapters/meta.ts';
	import { canonical } from '#lib/models/provider.ts';

	interface Part {
		id: string;
		name: string;
		what: string;
		chapters: number[];
		color: string;
		children?: string[];
	}

	const PARTS: Record<string, Part> = {
		app: {
			id: 'app',
			name: 'A chat app or agent',
			what: 'Everything you interact with.',
			chapters: [15],
			color: 'harness',
			children: ['you', 'harness', 'model']
		},
		you: {
			id: 'you',
			name: 'You',
			what: 'You type a message and read the reply.',
			chapters: [15],
			color: 'prob'
		},
		harness: {
			id: 'harness',
			name: 'The harness',
			what: 'Ordinary code that builds the prompt, calls the model in a loop, runs tools, and decides what the model gets to see.',
			chapters: [15, 17],
			color: 'harness',
			children: ['template', 'tools', 'loop', 'context', 'guards']
		},
		template: {
			id: 'template',
			name: 'Prompt and chat template',
			what: 'Turns the conversation, system prompt, and tool list into one text.',
			chapters: [13, 15],
			color: 'token'
		},
		tools: {
			id: 'tools',
			name: 'Tools',
			what: 'Code the harness runs when the model writes a tool call.',
			chapters: [16],
			color: 'harness'
		},
		loop: {
			id: 'loop',
			name: 'Agent loop',
			what: 'Call the model, run its tool calls, add the results, call again, until an answer or a limit.',
			chapters: [17],
			color: 'harness'
		},
		context: {
			id: 'context',
			name: 'Context management',
			what: 'Drops, summarizes, or retrieves text so it fits the window.',
			chapters: [8, 18],
			color: 'weight'
		},
		guards: {
			id: 'guards',
			name: 'Guardrails',
			what: 'Permission prompts, tool allowlists, sandboxes, and step limits.',
			chapters: [19],
			color: 'loss'
		},
		model: {
			id: 'model',
			name: 'The model',
			what: 'Turns text into probabilities for the next token, one token at a time.',
			chapters: [0, 11],
			color: 'prob',
			children: ['tokens', 'vectors', 'blocks', 'probs', 'pick']
		},
		tokens: {
			id: 'tokens',
			name: 'Tokens',
			what: 'Text becomes numbers, in pieces from a fixed vocabulary.',
			chapters: [1, 4],
			color: 'token'
		},
		vectors: {
			id: 'vectors',
			name: 'Embeddings',
			what: 'Each token becomes a list of numbers, plus its position.',
			chapters: [5],
			color: 'vector'
		},
		blocks: {
			id: 'blocks',
			name: `${canonical.layers} transformer blocks`,
			what: 'Each block refines every token’s vector.',
			chapters: [10],
			color: 'attention',
			children: ['attention', 'mlp', 'stream']
		},
		attention: {
			id: 'attention',
			name: 'Attention',
			what: 'Each token gathers information from earlier tokens.',
			chapters: [8, 9],
			color: 'attention'
		},
		mlp: {
			id: 'mlp',
			name: 'MLP',
			what: 'Layers of neurons with learned weights.',
			chapters: [6],
			color: 'weight'
		},
		stream: {
			id: 'stream',
			name: 'Residual stream and layer norm',
			what: 'Each step adds to a running vector.',
			chapters: [10],
			color: 'vector'
		},
		probs: {
			id: 'probs',
			name: 'Probabilities',
			what: 'A score for every token, turned into chances with softmax.',
			chapters: [2, 3],
			color: 'prob'
		},
		pick: {
			id: 'pick',
			name: 'Pick and append',
			what: 'Sample a token, add it, and repeat.',
			chapters: [3, 11],
			color: 'prob'
		}
	};

	let path = $state<string[]>(['app']);
	const current = $derived(PARTS[path.at(-1)!]);
	const title = (n: number) => chapterByNumber(n).title;
	const href = (n: number) => resolve('/[chapter]', { chapter: chapterByNumber(n).slug });
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
					{#each part.chapters as n (n)}
						<a href={href(n)}>Ch {n}: {title(n)}</a>
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

	.links a {
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
