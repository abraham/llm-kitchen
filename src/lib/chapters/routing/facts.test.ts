import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { cascade, type RoutingRecording } from '#lib/harness/routing.ts';

describe('which model answers?', () => {
	const rec: RoutingRecording = readDataset('routing/cascade');
	const q = (text: string) => rec.questions.find((x) => x.question.includes(text))!;
	const pct = (n: number) => Math.round(n * 100);

	it('asks 40 questions; the small model gets 26 right and the big one 37', () => {
		expect(rec.questions).toHaveLength(40);
		expect(rec.questions.filter((x) => x.small.correct)).toHaveLength(26);
		expect(rec.questions.filter((x) => x.big.correct)).toHaveLength(37);
		expect(rec.small.displayName).toBe('Qwen2.5-0.5B-Instruct');
		expect(rec.big.displayName).toBe('Qwen2.5-1.5B-Instruct');
		expect(Math.round(rec.big.parameters / rec.small.parameters)).toBe(3);
	});

	it('at 60%: passes on 15, gets 34 right, for 70% of the cost', () => {
		expect(cascade(rec, 0.6)).toMatchObject({ escalated: 15, right: 34 });
		expect(pct(cascade(rec, 0.6).cost)).toBe(70);
	});

	it('at 80%: passes on 25 and matches the big model’s 37, for 95%', () => {
		expect(cascade(rec, 0.8)).toMatchObject({ escalated: 25, right: 37 });
		expect(pct(cascade(rec, 0.8).cost)).toBe(95);
	});

	it('every wrong small answer is at 79% or less, and so are 11 right ones', () => {
		const wrong = rec.questions.filter((x) => !x.small.correct);
		expect(wrong).toHaveLength(14);
		expect(Math.max(...wrong.map((x) => x.small.confidence))).toBeLessThan(0.795);
		expect(rec.questions.filter((x) => x.small.correct && x.small.confidence < 0.795)).toHaveLength(
			11
		);
	});

	it('Sydney at 79% is wrong; Ankara at 25% is right', () => {
		const australia = q('Australia').small;
		expect(australia.answer).toBe('Sydney');
		expect(pct(australia.confidence)).toBe(79);
		expect(australia.correct).toBe(false);
		const turkey = q('Turkey').small;
		expect(turkey.answer).toBe('Ankara');
		expect(pct(turkey.confidence)).toBe(25);
		expect(turkey.correct).toBe(true);
	});

	it('in depth: weights 0.49 and 1.54 billion (r ≈ 3.12); small alone costs 32%', () => {
		expect((rec.small.parameters / 1e9).toFixed(2)).toBe('0.49');
		expect((rec.big.parameters / 1e9).toFixed(2)).toBe('1.54');
		expect((rec.big.parameters / rec.small.parameters).toFixed(2)).toBe('3.12');
		expect(pct(cascade(rec, 0).cost)).toBe(32);
	});

	it('confidence is a probability, and the grading matches the accepted answers', () => {
		for (const x of rec.questions) {
			for (const a of [x.small, x.big]) {
				expect(a.confidence).toBeGreaterThan(0);
				expect(a.confidence).toBeLessThanOrEqual(1);
				const hit = x.accepted.some((ok) => a.answer.toLowerCase().includes(ok.toLowerCase()));
				if (a.correct) expect(hit, `${x.question}: ${a.answer}`).toBe(true);
			}
		}
	});
});
