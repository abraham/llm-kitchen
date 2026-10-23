<script lang="ts">
	import WidgetFrame from '#lib/components/layout/WidgetFrame.svelte';
	import { QWEN_DEFAULT_SYSTEM, chatTemplate, type ChatMessage } from '#lib/math/chat-template.ts';

	const EXAMPLE: ChatMessage[] = [
		{ role: 'user', content: 'What is the capital of France?' },
		{ role: 'assistant', content: 'The capital of France is Paris.' }
	];

	let system = $state('');
	let message = $state('And of Italy?');
	let raw = $state(true);
	const id = $props.id();

	const messages = $derived<ChatMessage[]>([
		...(system.trim() ? [{ role: 'system' as const, content: system }] : []),
		...EXAMPLE,
		{ role: 'user', content: message }
	]);
	const parts = $derived(chatTemplate(messages));
	const names = { system: 'System', user: 'You', assistant: 'Assistant' } as const;
</script>

<WidgetFrame
	title="What the model actually reads"
	source={{ kind: 'computed' }}
	onreset={() => {
		system = '';
		message = 'And of Italy?';
		raw = true;
	}}
>
	<div class="inputs">
		<label for="{id}-system" class="label">System prompt (empty uses the built-in one)</label>
		<input id="{id}-system" type="text" bind:value={system} placeholder={QWEN_DEFAULT_SYSTEM} />
		<label for="{id}-message" class="label">Your next message</label>
		<input id="{id}-message" type="text" bind:value={message} />
	</div>

	<div class="views">
		<label class="toggle"><input type="checkbox" bind:checked={raw} /> Show the raw text</label>
	</div>

	{#if raw}
		<pre class="raw" aria-label="The text sent to the model">{#each parts as p, i (i)}<span
					class={p.kind}>{p.text}</span
				>{/each}<span class="cursor" aria-hidden="true">▍</span></pre>
		<p class="note">
			<span class="key marker">markers</span> are special tokens that only the chat format uses;
			<span class="key system">system</span>, <span class="key user">you</span>, and
			<span class="key assistant">assistant</span> show where each piece came from. The model writes
			from the cursor on, and stops when it writes <code>&lt;|im_end|&gt;</code>.
		</p>
	{:else}
		<ol class="chat">
			{#each messages as m, i (i)}
				<li class={m.role}><span class="who">{names[m.role]}</span> {m.content}</li>
			{/each}
		</ol>
		<p class="note">
			This is how a chat app shows it. Turn on the raw text to see what the model gets.
		</p>
	{/if}
</WidgetFrame>

<style>
	.inputs {
		display: grid;
		gap: var(--space-1);
		margin-bottom: var(--space-3);
	}

	.inputs input {
		font: inherit;
		font-size: 0.95rem;
		margin-bottom: var(--space-2);
	}

	.toggle {
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	.raw {
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.6;
		padding: var(--space-3);
		background: var(--surface-2);
		border-radius: var(--radius);
		margin: var(--space-3) 0 0;
	}

	.marker {
		color: var(--c-token-ink);
		background: var(--c-token-tint);
		border-radius: 2px;
	}

	.system {
		color: var(--c-harness-ink);
		background: var(--c-harness-tint);
	}

	.user {
		color: var(--c-prob-ink);
	}

	.assistant {
		color: var(--c-vector-ink);
	}

	.cursor {
		color: var(--c-vector);
	}

	.key {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0 2px;
	}

	.chat {
		list-style: none;
		padding: 0;
		margin: var(--space-3) 0 0;
		display: grid;
		gap: var(--space-2);
	}

	.chat li {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		max-width: 80%;
	}

	.chat .user {
		justify-self: end;
		background: var(--c-prob-tint);
	}

	.chat .assistant {
		background: var(--c-vector-tint);
	}

	.chat .system {
		font-size: 0.85rem;
		font-style: italic;
	}

	.who {
		display: block;
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
