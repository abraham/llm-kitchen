// Checks that the numbers and examples in the Part VI prose match the recorded agent runs.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AgentRun, ContextSession } from '../../src/lib/harness/agent.ts';
import { calculator } from '../../src/lib/harness/tools.ts';

const run = (name: string): AgentRun =>
	JSON.parse(readFileSync(`static/agent/${name}.json`, 'utf8'));
const calls = (r: AgentRun) => r.steps.filter((s) => s.call).map((s) => s.call!.name);

describe('Ch 15: the model is not the product', () => {
	const chat = run('chat');
	it('a 31-character message became a 400-token prompt, then 493', () => {
		expect(chat.task).toHaveLength(31);
		expect(chat.steps.map((s) => s.promptTokens)).toEqual([400, 493]);
	});

	it('the model looked up a rhyme before answering', () => {
		expect(calls(chat)).toEqual(['search_rhymes']);
		expect(chat.finished).toBe(true);
	});
});

describe('Ch 16: tools', () => {
	it('without tools: 7,050,952; the right answer is 7,006,652', () => {
		expect(run('math-no-tools').steps[0].output).toContain('7,050,952');
		expect(calculator('1234 * 5678')).toBe('7006652');
	});

	it('with a calculator, the answer is right', () => {
		const r = run('math-tools');
		expect(calls(r)).toEqual(['calculator']);
		expect(r.steps.at(-1)!.thought).toContain('7006652');
	});
});

describe('Ch 17: the agent loop', () => {
	const r = run('agent-cat');
	it('search, count, answer: 30 words', () => {
		expect(calls(r)).toEqual(['search_rhymes', 'count_words']);
		expect(r.steps[1].result).toBe('30');
		expect(r.steps.at(-1)!.thought).toContain('30 words');
	});

	it('prompts of 301, 394, then 483 tokens; at most 8 calls', () => {
		expect(r.steps.map((s) => s.promptTokens)).toEqual([301, 394, 483]);
		expect(r.maxSteps).toBe(8);
	});
});

describe('Ch 18: managing the context', () => {
	const c: ContextSession = JSON.parse(readFileSync('static/agent/context.json', 'utf8'));
	const total = (kept: number[], note = 0) =>
		c.baseTokens + c.questionTokens + note + kept.reduce((a, i) => a + c.turns[i].tokens, 0);

	it('everything overflows the 1,500-token budget; every strategy fits', () => {
		expect(c.budget).toBe(1500);
		expect(total(c.strategies.all.kept)).toBeGreaterThan(c.budget);
		for (const key of ['dropOldest', 'summarize', 'retrieve'] as const) {
			const s = c.strategies[key];
			expect(total(s.kept, s.noteTokens), key).toBeLessThanOrEqual(c.budget);
		}
	});

	it('dropping the oldest loses the cat task and the model makes up "Old Mother Hubbard"', () => {
		expect(c.strategies.dropOldest.kept).not.toContain(0);
		expect(c.strategies.dropOldest.answer).toContain('Old Mother Hubbard');
	});

	it('summarizing keeps "30 words"; retrieval brings back the cat task (closest match)', () => {
		expect(c.strategies.summarize.summary).toContain('30');
		expect(c.strategies.summarize.answer).toContain('30');
		const best = c.turns.reduce((b, t, i) => (t.similarity > c.turns[b].similarity ? i : b), 0);
		expect(best).toBe(0);
		expect(c.strategies.retrieve.retrieved).toEqual([0]);
		expect(c.strategies.retrieve.answer).toContain('30');
	});
});

describe('Ch 19: trust and guardrails', () => {
	it('no guardrails: all three files deleted, then the step limit', () => {
		const r = run('inject-none');
		expect(r.files.after).toEqual([]);
		expect(r.finished).toBe(false);
		expect(r.steps).toHaveLength(r.maxSteps);
	});

	it('ask first: six refused deletions, nothing lost', () => {
		const r = run('inject-ask');
		expect(r.steps.filter((s) => s.blocked)).toHaveLength(6);
		expect(r.files.after).toEqual(r.files.before);
	});

	it('only safe tools: it still tried delete_file, nothing lost', () => {
		const r = run('inject-allowlist');
		expect(calls(r)).toContain('delete_file');
		expect(r.tools.map((t) => t.name)).not.toContain('delete_file');
		expect(r.files.after).toEqual(r.files.before);
	});

	it('a 3-step limit still loses one file', () => {
		const first3 = run('inject-none').steps.slice(0, 3);
		expect(first3.filter((s) => s.result?.startsWith('Deleted'))).toHaveLength(1);
	});
});
