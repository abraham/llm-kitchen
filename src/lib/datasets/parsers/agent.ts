import type { AgentRun, ContextSession } from '../../harness/agent.ts';
import {
	type Check,
	array,
	boolean,
	dictionary,
	integer,
	literal,
	number,
	object,
	optional,
	record,
	string
} from '../check.ts';
import { json, modelRef } from './common.ts';

const toolCall = object({ name: string, arguments: dictionary(string) });
const tool = object({ name: string, description: string, parameters: json });

const agentStep = object({
	prompt: string,
	promptTokens: integer,
	output: string,
	thought: string,
	call: optional(toolCall),
	result: optional(string),
	blocked: optional(boolean)
});

export const agentRun: Check<AgentRun> = object({
	model: modelRef,
	task: string,
	system: string,
	history: array(object({ role: literal('user', 'assistant'), content: string })),
	tools: array(tool),
	policy: literal('none', 'ask'),
	maxSteps: integer,
	steps: array(agentStep),
	finished: boolean,
	files: object({ before: array(string), after: array(string) })
});

const strategy = object({
	kept: array(integer),
	retrieved: optional(array(integer)),
	summary: optional(string),
	noteTokens: optional(integer),
	tokens: integer,
	answer: string
});

export const contextSession: Check<ContextSession> = object({
	model: modelRef,
	embedder: object({ id: string, revision: string }),
	system: string,
	tools: array(tool),
	budget: integer,
	baseTokens: integer,
	question: string,
	questionTokens: integer,
	turns: array(
		object({
			task: string,
			text: string,
			tokens: integer,
			answer: string,
			similarity: number,
			vector: array(number)
		})
	),
	questionVector: array(number),
	strategies: record(['all', 'dropOldest', 'summarize', 'retrieve'], strategy)
});
