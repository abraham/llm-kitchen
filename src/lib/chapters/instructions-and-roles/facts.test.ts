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

describe('many rules at once', () => {
	const d = readDataset('prompts/rules');
	// The same checks as the recording script, so the stored verdicts can't drift from the replies.
	const CHECKS: ((t: string) => boolean)[] = [
		(t) => t.trim().toLowerCase().startsWith('hello'),
		(t) => t.toLowerCase().includes('harbor'),
		(t) => t.split(/\s+/).filter(Boolean).length < 60,
		(t) => !t.includes(','),
		(t) => t === t.toLowerCase(),
		(t) => /\d/.test(t),
		(t) =>
			t
				.toLowerCase()
				.replace(/[^a-z ]/g, '')
				.trim()
				.endsWith('see you soon'),
		(t) => !/\bthe\b/i.test(t),
		(t) => t.includes('?'),
		(t) => t.toLowerCase().includes('lemonade')
	];
	const at = (k: number) => d.notes.map((n) => n.runs[d.counts.indexOf(k)]);
	const kept = (k: number) => at(k).reduce((s, r) => s + r.followed.filter(Boolean).length, 0);
	const every = (k: number) => at(k).filter((r) => r.followed.every(Boolean)).length;

	it('every stored verdict matches its check', () => {
		expect(d.rules).toHaveLength(CHECKS.length);
		for (const n of d.notes)
			for (const r of n.runs) expect(r.followed).toEqual(r.rules.map((i) => CHECKS[i](r.reply)));
	});

	it('the prompts list the rules in order', () => {
		for (const n of d.notes)
			for (const r of n.runs)
				expect(r.prompt).toBe(
					`${n.task} Follow these rules:\n` +
						r.rules.map((i, j) => `${j + 1}. ${d.rules[i]}`).join('\n')
				);
	});

	it('one rule: kept in 7 of 12 notes; ten rules: 88 of 120 kept, no note kept all ten', () => {
		expect(d.notes).toHaveLength(12);
		expect(d.counts).toEqual([1, 2, 4, 6, 8, 10]);
		expect([kept(1), every(1)]).toEqual([7, 7]);
		expect([kept(10), every(10)]).toEqual([88, 0]);
		expect(d.counts.map(every)).toEqual([7, 7, 3, 4, 1, 0]);
	});

	it('with ten rules, most misses were no "the", a question, or a number, from all over the list', () => {
		const runs = at(10);
		const missed = runs.flatMap((r) => r.rules.filter((_, i) => !r.followed[i]));
		const count = (rule: number) => missed.filter((m) => m === rule).length;
		expect(missed).toHaveLength(32);
		expect([count(7), count(8), count(5)]).toEqual([7, 7, 6]);
		const positions = new Set(runs.flatMap((r) => r.followed.flatMap((f, i) => (f ? [] : [i]))));
		expect([...positions].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('in depth: 0.73 per rule gives about a 4% chance of keeping all ten', () => {
		const p = kept(10) / 120;
		expect(p).toBeCloseTo(0.73, 2);
		expect(p ** 10).toBeCloseTo(0.045, 3);
	});
});
