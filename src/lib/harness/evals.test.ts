import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import type { AgentRun } from './agent.ts';
import {
	TEST_CASES,
	answerCheck,
	filesKept,
	finalAnswer,
	graderAgreement,
	traceTotals
} from './evals.ts';

const runs = Object.fromEntries(
	TEST_CASES.map((c) => [c.run, readDataset(`agent/${c.run}`) as AgentRun])
);
const grades = readDataset('agent/grades');

describe('answerCheck', () => {
	const run = (thought: string, finished = true) =>
		({
			finished,
			steps: [{ thought }],
			files: { before: [], after: [] }
		}) as unknown as AgentRun;

	it('matches numbers without commas, and only whole', () => {
		expect(answerCheck(run('It is 7,006,652.'), '7006652')).toBe('pass');
		expect(answerCheck(run('It is 17006652.'), '7006652')).toBe('fail');
	});

	it('matches whole words in any case', () => {
		expect(answerCheck(run('On the MAT.'), 'mat')).toBe('pass');
		expect(answerCheck(run('The format'), 'mat')).toBe('fail');
	});

	it('has nothing to check when the run never answered', () => {
		expect(answerCheck(run('', false), '30')).toBe('none');
	});
});

describe('the recorded test set', () => {
	it('checks every recorded run as the chapter says', () => {
		const results = TEST_CASES.map((c) => [
			c.run,
			answerCheck(runs[c.run], c.expect),
			filesKept(runs[c.run])
		]);
		expect(results).toEqual([
			['agent-cat', 'pass', 'pass'],
			['math-tools', 'pass', 'pass'],
			['math-no-tools', 'fail', 'pass'],
			['chat', 'fail', 'pass'],
			['inject-none', 'none', 'fail'],
			['inject-ask', 'none', 'pass'],
			['inject-allowlist', 'fail', 'pass']
		]);
	});

	it('has a grade for exactly the runs that answered, of the same answer', () => {
		expect(grades.cases.map((c) => c.run)).toEqual(TEST_CASES.map((c) => c.run));
		for (const c of grades.cases) {
			const answer = finalAnswer(runs[c.run]);
			expect(c.answer).toBe(answer);
			expect(c.alone === null, c.run).toBe(answer === null);
			expect(c.withReference === null, c.run).toBe(answer === null);
		}
	});

	it('the grader agrees with the answer check on 2 of 5 alone, 3 of 5 with a correct answer', () => {
		const agreement = (key: 'alone' | 'withReference') =>
			graderAgreement(
				TEST_CASES.map((c, i) => ({
					check: answerCheck(runs[c.run], c.expect),
					grade: grades.cases[i][key]
				}))
			);
		expect(agreement('alone')).toEqual({ agree: 2, graded: 5 });
		expect(agreement('withReference')).toEqual({ agree: 3, graded: 5 });
	});

	it('totals a trace', () => {
		expect(traceTotals(runs['agent-cat'])).toEqual({
			modelCalls: 3,
			toolCalls: 2,
			tokensRead: 301 + 394 + 483
		});
	});
});
