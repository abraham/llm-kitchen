import { describe, expect, it } from 'vitest';
import { chapter } from '#lib/curriculum/index.ts';
import { QUESTIONS } from '#lib/chapters/quiz/data.ts';
import type { Level } from '#lib/levels.ts';

describe('check yourself', () => {
	it('asks at least one question from every Part I–IX', () => {
		const parts = new Set(QUESTIONS.flatMap((q) => q.chapters.map((s) => chapter(s).part.number)));
		for (const p of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'])
			expect(parts).toContain(p);
	});

	it('keeps the questions in reading order, each with a valid answer', () => {
		const first = QUESTIONS.map((q) => chapter(q.chapters[0]).number);
		expect(first).toEqual([...first].sort((a, b) => a - b));
		for (const q of QUESTIONS) {
			expect(q.options[q.answer]).toBeDefined();
			expect(new Set(q.options).size).toBe(q.options.length);
			expect(q.why).not.toMatch(/Ch \d/);
		}
		const at = (level: Level) => QUESTIONS.filter((q) => !q.levels || q.levels.includes(level));
		expect([at('simple'), at('standard'), at('deep')].map((qs) => qs.length)).toEqual([15, 15, 19]);
	});
});
