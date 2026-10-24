import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { chatTemplate } from '#lib/math/chat-template.ts';

describe('system prompts', () => {
	const d = readDataset('prompts/system');

	it('the site’s chat template matches the recorded prompts', () => {
		for (const r of d.replies) {
			const text = chatTemplate([
				{ role: 'system', content: r.system },
				{ role: 'user', content: d.question }
			])
				.map((p) => p.text)
				.join('');
			expect(text).toBe(r.prompt);
		}
	});

	it('the persona makes the answer over twice as long; instructions make it shorter', () => {
		const [plain, persona, specific] = d.replies;
		expect(persona.tokens).toBeGreaterThan(2 * plain.tokens);
		expect(specific.tokens).toBeLessThan(plain.tokens);
		expect(persona.text).toContain('scattered away from us towards the edges of the sky');
	});

	it('the "never makes mistakes" persona got 3 of 8 sums right, the default 5', () => {
		expect(d.math.filter((m) => m.default.correct)).toHaveLength(5);
		expect(d.math.filter((m) => m.persona.correct)).toHaveLength(3);
	});

	it('in depth: with no system prompt, the template fills in Qwen’s default', () => {
		const text = chatTemplate([{ role: 'user', content: d.question }])
			.map((p) => p.text)
			.join('');
		expect(text).toBe(d.replies[0].prompt);
		expect(text).toContain(
			'<|im_start|>system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.<|im_end|>'
		);
	});
});
