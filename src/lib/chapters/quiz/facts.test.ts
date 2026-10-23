import { describe, expect, it } from 'vitest';
import { chapter } from '#lib/curriculum/index.ts';
import { QUESTIONS } from '#lib/chapters/quiz/data.ts';

describe('check yourself', () => {
	it('asks at least one question from every Part I–VIII', () => {
		const parts = new Set(QUESTIONS.flatMap((q) => q.chapters.map((s) => chapter(s).part.number)));
		for (const p of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']) expect(parts).toContain(p);
	});

	it('keeps the questions in reading order, each with a valid answer', () => {
		const first = QUESTIONS.map((q) => chapter(q.chapters[0]).number);
		expect(first).toEqual([...first].sort((a, b) => a - b));
		for (const q of QUESTIONS) {
			expect(q.options[q.answer]).toBeDefined();
			expect(new Set(q.options).size).toBe(q.options.length);
			expect(q.why).not.toMatch(/Ch \d/);
		}
		expect(QUESTIONS).toHaveLength(14);
	});
});
