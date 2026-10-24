<script lang="ts">
	type Message = { role: 'system' | 'user' | 'assistant'; content: string };

	let { messages, label }: { messages: readonly Message[]; label: string } = $props();

	const WHO = { system: 'System', user: 'You', assistant: 'Assistant' } as const;
</script>

<ol class="chat" aria-label={label}>
	{#each messages as m, i (i)}
		<li class={m.role}><span class="who">{WHO[m.role]}</span>{m.content}</li>
	{/each}
</ol>

<style>
	.chat {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		align-content: start;
		gap: var(--space-2);
		font-size: 0.9rem;
	}

	li {
		max-width: 85%;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		white-space: pre-wrap;
	}

	.user {
		justify-self: end;
		background: var(--c-prob-tint);
	}

	.assistant {
		background: var(--c-vector-tint);
	}

	.system {
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
		white-space: normal;
	}
</style>
