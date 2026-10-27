import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { calculator } from '#lib/harness/tools.ts';
import { AGREE, consistencyCheck, groupAnswers, summarize } from '#lib/harness/hallucination.ts';
import { QUESTIONS, TASKS, concerns, verdict } from './data.ts';

const samples = readDataset('hallucination/samples');
const sample = (id: string) => samples.questions.find((x) => x.id === id)!;
const evidence = (id: string) => QUESTIONS.find((q) => q.id === id)!.evidence;

describe('is a model the right tool?', () => {
	it('without a calculator: 7,050,952 for 1234 × 5678; the answer is 7,006,652', () => {
		const run = readDataset('agent/math-no-tools');
		expect(run.model.displayName).toBe('Qwen2.5-1.5B-Instruct');
		expect(run.steps[0].output).toContain('7,050,952');
		expect(calculator('1234 * 5678')).toBe('7006652');
		expect(evidence('likely')).toContain('7,050,952');
		expect(evidence('likely')).toContain('7,006,652');
	});

	it('the made-up novel: nine different authors in ten tries, from the same model', () => {
		const q = sample('velmora');
		expect(q.question).toContain('The Lanterns of Velmora');
		expect(q.kind).toBe('invented');
		expect(q.answers.plain).toHaveLength(10);
		expect(groupAnswers(q.answers.plain)).toHaveLength(9);
		expect(samples.model.id).toBe('Qwen/Qwen2.5-1.5B-Instruct');
	});

	it('1987 Tour de France: Eddy Merckx ten times out of ten; it was Stephen Roche', () => {
		const q = sample('roche');
		expect(q.question).toBe('Who won the Tour de France in 1987?');
		expect(q.answers.plain.map((a) => a.text)).toEqual(Array(10).fill('Eddy Merckx'));
		expect(q.truth).toBe('Stephen Roche');
	});

	it('the dropped chat could not name the child; with retrieval it said Lily', () => {
		const c = readDataset('agent/context');
		expect(c.strategies.dropOldest.answer).toContain("don't have information");
		expect(c.strategies.retrieve.answer).toContain('Lily');
	});

	it('the small model was 79% sure that Sydney is the capital of Australia', () => {
		const q = readDataset('routing/cascade').questions.find((x) =>
			x.question.includes('Australia')
		)!;
		expect([q.small.answer, Math.round(q.small.confidence * 100), q.small.correct]).toEqual([
			'Sydney',
			79,
			false
		]);
	});

	it('the short call read a 400-token prompt; ten thousand of them is four million tokens', () => {
		expect(readDataset('agent/chat').steps[0].promptTokens).toBe(400);
		expect(400 * 10_000).toBe(4_000_000);
	});

	it('in depth: the check trusts 8 of 10, flags 4 of 5 wrong and 0 of 6 right, and misses Roche', () => {
		expect(AGREE).toBe(8);
		expect(samples.questions).toHaveLength(11);
		expect(summarize(samples.questions, 'plain')).toMatchObject({
			right: 6,
			wrong: 5,
			wrongFlagged: 4,
			rightFlagged: 0
		});
		expect(consistencyCheck(sample('roche').answers.plain).outcome).toBe('trusted');
	});

	it('every preset task gets a verdict, and the good fits raise no concerns', () => {
		const byId = Object.fromEntries(TASKS.map((t) => [t.id, t.answers]));
		expect(concerns(byId.friendlier)).toEqual([]);
		expect(concerns(byId.names)).toEqual([]);
		expect(concerns(byId.meeting).map((q) => q.id)).toEqual(['known']);
		expect(concerns(byId.contract).map((q) => q.id)).toEqual(['checkable']);
		expect(verdict(byId.multiply)).toBe('Reach for the simpler tool first.');
		expect(verdict(byId.novel)).toBe('Reach for the simpler tool first.');
		for (const q of QUESTIONS) expect(q.chapters).toHaveLength(2);
	});
});
