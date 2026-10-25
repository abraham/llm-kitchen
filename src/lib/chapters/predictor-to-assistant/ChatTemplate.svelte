<script lang="ts">
	import TierStatus from '#lib/components/frame/TierStatus.svelte';
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChatLog from '#lib/components/primitives/ChatLog.svelte';
	import PromptText from '#lib/components/primitives/PromptText.svelte';
	import { roleStyle } from '#lib/components/primitives/roles.ts';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import { QWEN_DEFAULT_SYSTEM, chatTemplate, type ChatMessage } from '#lib/math/chat-template.ts';
	import { useProvider } from '#lib/models/live.svelte.ts';

	const EXAMPLE: ChatMessage[] = [
		{ role: 'user', content: 'What is the capital of France?' },
		{ role: 'assistant', content: 'The capital of France is Paris.' }
	];
	const MAX_TOKENS = 200;

	let system = $state('');
	let message = $state('And of Italy?');
	let raw = $state(true);
	const id = $props.id();
	const option = useProvider('chat', 'Qwen2.5-1.5B-Instruct');
	/** The live reply and the chat it answers, so editing the chat clears it. */
	let reply = $state<{ key: string; text: string; done: boolean } | null>(null);
	let problem = $state('');

	const messages = $derived<ChatMessage[]>([
		...(system.trim() ? [{ role: 'system' as const, content: system }] : []),
		...EXAMPLE,
		{ role: 'user', content: message }
	]);
	const parts = $derived(chatTemplate(messages));
	const key = $derived(JSON.stringify(messages));
	const shown = $derived(option.live && reply?.key === key ? reply : null);

	async function send() {
		const provider = option.provider;
		if (!provider?.reply) return;
		const asked = key;
		problem = '';
		reply = { key: asked, text: '', done: false };
		try {
			const r = await provider.reply(
				{ messages },
				{
					maxTokens: MAX_TOKENS,
					ontext: (text) => reply?.key === asked && (reply.text = text)
				}
			);
			if (reply?.key === asked) reply = { key: asked, text: r.text, done: true };
		} catch (error) {
			problem = error instanceof Error ? error.message : String(error);
			reply = null;
		}
	}
</script>

<WidgetFrame
	title="What the model actually reads"
	source={option.live ? option.source : { kind: 'computed' }}
	live={option}
	onreset={() => {
		system = '';
		message = 'And of Italy?';
		raw = true;
		reply = null;
	}}
>
	<div class="inputs">
		<label for="{id}-system" class="label">System prompt (empty uses the built-in one)</label>
		<input id="{id}-system" type="text" bind:value={system} placeholder={QWEN_DEFAULT_SYSTEM} />
		<label for="{id}-message" class="label">Your next message</label>
		<input id="{id}-message" type="text" bind:value={message} />
	</div>

	<div class="views">
		<Toggle label="Show the raw text" bind:checked={raw} />
		{#if option.live}
			<button type="button" onclick={send} disabled={reply?.key === key && !reply.done}
				>Send it to the model</button
			>
		{/if}
	</div>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	{#if raw}
		<PromptText {parts} label="The text sent to the model" maxHeight="none">
			{#snippet after()}{#if shown}<span class="reply" aria-live="polite">{shown.text}</span
					>{/if}{#if !shown?.done}<span class="cursor" aria-hidden="true">▍</span>{/if}{/snippet}
		</PromptText>
		<p class="note">
			<span class="key" style={roleStyle('marker')}>markers</span> are special tokens that only the
			chat format uses; <span class="key" style={roleStyle('system')}>system</span>,
			<span class="key" style={roleStyle('user')}>you</span>, and
			<span class="key" style={roleStyle('assistant')}>assistant</span> show where each piece came
			from. The model writes from the cursor on, and stops when it writes
			<code>&lt;|im_end|&gt;</code>.
		</p>
	{:else}
		<ChatLog
			messages={shown ? [...messages, { role: 'assistant', content: shown.text }] : messages}
			label="The chat, as an app shows it"
		/>
		<p class="note">
			This is how a chat app shows it. Turn on the raw text to see what the model gets.
		</p>
	{/if}
	<TierStatus
		{option}
		purpose="Send this exact text to Qwen2.5-0.5B-Instruct and watch it write the reply."
	/>
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

	.views {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-3);
	}

	.reply {
		color: var(--c-vector-ink);
	}

	.problem {
		color: var(--c-loss-ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	.cursor {
		color: var(--c-vector);
	}

	.key {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0 2px;
	}

	.note {
		font-size: 0.875rem;
		color: var(--ink-muted);
		margin: var(--space-2) 0 0;
	}
</style>
