import {
	type Infer,
	array,
	boolean,
	dictionary,
	integer,
	nullable,
	number,
	object,
	record,
	string,
	tuple
} from '../check.ts';
import { guess, modelRef } from './common.ts';

const output = object({ text: string, stopped: boolean });

export const COLUMNS = ['gpt2', 'base', 'instructNoTemplate', 'instruct'] as const;
export type Column = (typeof COLUMNS)[number];

export const baseVsInstruct = object({
	maxNewTokens: integer,
	models: record(['gpt2', 'base', 'instruct'], modelRef),
	prompts: array(
		object({
			prompt: string,
			template: string,
			gpt2: output,
			base: output,
			instructNoTemplate: output,
			instruct: output
		})
	)
});
export type BaseVsInstruct = Infer<typeof baseVsInstruct>;

const thinkingRun = object({
	thinking: string,
	thinkingTokens: integer,
	answer: string,
	answerTokens: integer,
	final: nullable(string),
	correct: boolean,
	stopped: boolean
});
export type ThinkingRun = Infer<typeof thinkingRun>;

const sampling = object({
	temperature: number,
	top_p: number,
	top_k: integer,
	max_new_tokens: integer
});

export const thinking = object({
	model: modelRef,
	settings: object({ off: sampling, on: sampling, seed: integer, suffix: string }),
	puzzles: array(object({ question: string, expected: string, off: thinkingRun, on: thinkingRun }))
});
export type Thinking = Infer<typeof thinking>;

const promptToken = object({ text: string, id: integer });

const variant = object({
	text: string,
	tokens: array(promptToken),
	firstTokenShare: number,
	attention: array(number),
	top: array(guess),
	watch: dictionary(number)
});

export const wording = object({
	model: modelRef,
	groups: array(object({ name: string, watch: array(string), variants: array(variant) }))
});
export type Wording = Infer<typeof wording>;

export const fewShot = object({
	models: record(['gpt2', 'qwen'], modelRef),
	shots: array(integer),
	tasks: array(
		object({
			name: string,
			examples: array(tuple(string, string)),
			tests: array(
				object({
					query: string,
					answer: string,
					runs: array(
						object({
							shots: integer,
							text: string,
							gpt2: number,
							qwen: number,
							gpt2Top: array(guess)
						})
					)
				})
			),
			head: object({
				layer: integer,
				head: integer,
				text: string,
				tokens: array(promptToken),
				attention: array(number),
				score: number
			})
		})
	)
});
export type FewShot = Infer<typeof fewShot>;

const answer = object({ text: string, correct: boolean });

export const systemPrompts = object({
	model: modelRef,
	question: string,
	replies: array(
		object({
			name: string,
			system: string,
			prompt: string,
			text: string,
			tokens: integer,
			stopped: boolean
		})
	),
	persona: string,
	math: array(object({ question: string, expected: number, default: answer, persona: answer }))
});
export type SystemPrompts = Infer<typeof systemPrompts>;

export const steps = object({
	model: modelRef,
	conditions: array(object({ name: string, suffix: string })),
	puzzles: array(
		object({
			question: string,
			expected: string,
			runs: array(
				object({
					condition: string,
					text: string,
					tokens: integer,
					stopped: boolean,
					correct: boolean,
					formatted: boolean
				})
			)
		})
	)
});
export type Steps = Infer<typeof steps>;

export const fragile = object({
	models: record(['gpt2', 'qwen'], modelRef),
	sentiment: object({
		examples: array(tuple(string, string)),
		tests: array(tuple(string, string)),
		orders: array(object({ order: array(integer), correct: integer })),
		formats: array(object({ name: string, example: string, correct: integer }))
	}),
	position: object({
		facts: integer,
		positions: array(integer),
		runs: array(
			object({
				name: string,
				number: integer,
				points: array(object({ position: integer, p: number }))
			})
		)
	})
});
export type Fragile = Infer<typeof fragile>;
