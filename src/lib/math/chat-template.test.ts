import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { QWEN_DEFAULT_SYSTEM, chatTemplate } from './chat-template.ts';

const recorded: { prompts: { prompt: string; template: string }[] } =
	readDataset('chat/base-vs-instruct');

describe('chatTemplate', () => {
	it('matches the text Qwen2.5-Instruct’s own tokenizer produced', () => {
		for (const { prompt, template } of recorded.prompts) {
			const text = chatTemplate([{ role: 'user', content: prompt }])
				.map((p) => p.text)
				.join('');
			expect(text).toBe(template);
		}
	});

	it('keeps a custom system prompt instead of the default', () => {
		const parts = chatTemplate([
			{ role: 'system', content: 'Be brief.' },
			{ role: 'user', content: 'Hi' }
		]);
		expect(parts.map((p) => p.text).join('')).not.toContain(QWEN_DEFAULT_SYSTEM);
		expect(parts[1]).toEqual({ kind: 'system', text: 'Be brief.' });
	});

	it('ends by opening the assistant turn only when asked', () => {
		const msgs = [{ role: 'user' as const, content: 'Hi' }];
		expect(chatTemplate(msgs).at(-1)!.text).toBe('<|im_start|>assistant\n');
		expect(chatTemplate(msgs, false).at(-1)!.text).toBe('<|im_end|>\n');
	});
});
