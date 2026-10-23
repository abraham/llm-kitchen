/** The chat template used by Qwen2.5 instruct models (ChatML), for `predictor-to-assistant`. */
export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** Qwen2.5's built-in system prompt, used when a conversation doesn't start with one. */
export const QWEN_DEFAULT_SYSTEM =
	'You are Qwen, created by Alibaba Cloud. You are a helpful assistant.';

export interface TemplatePart {
	kind: 'marker' | ChatMessage['role'];
	text: string;
}

/**
 * The exact text the model reads, split into parts so it can be colored. With
 * `addGenerationPrompt`, it ends by opening the assistant's turn for the model to continue.
 */
export function chatTemplate(messages: ChatMessage[], addGenerationPrompt = true): TemplatePart[] {
	const all =
		messages[0]?.role === 'system'
			? messages
			: [{ role: 'system' as const, content: QWEN_DEFAULT_SYSTEM }, ...messages];
	const parts: TemplatePart[] = [];
	for (const m of all) {
		parts.push({ kind: 'marker', text: `<|im_start|>${m.role}\n` });
		parts.push({ kind: m.role, text: m.content });
		parts.push({ kind: 'marker', text: '<|im_end|>\n' });
	}
	if (addGenerationPrompt) parts.push({ kind: 'marker', text: '<|im_start|>assistant\n' });
	return parts;
}
