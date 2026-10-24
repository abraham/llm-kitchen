<script lang="ts">
	import WidgetFrame from '#lib/components/frame/WidgetFrame.svelte';
	import ChatLog from '#lib/components/primitives/ChatLog.svelte';
	import PromptText from '#lib/components/primitives/PromptText.svelte';
	import { roleStyle } from '#lib/components/primitives/roles.ts';
	import Toggle from '#lib/components/ui/Toggle.svelte';
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
		<Toggle label="Show the raw text" bind:checked={raw} />
	</div>

	{#if raw}
		<PromptText {parts} label="The text sent to the model" maxHeight="none">
			{#snippet after()}<span class="cursor" aria-hidden="true">▍</span>{/snippet}
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
		<ChatLog {messages} label="The chat, as an app shows it" />
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

	.views {
		margin-bottom: var(--space-3);
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
