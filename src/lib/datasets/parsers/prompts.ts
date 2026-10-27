import {
	type Infer,
	DataError,
	array,
	boolean,
	derive,
	dictionary,
	integer,
	literal,
	nullable,
	number,
	object,
	record,
	string,
	tuple
} from '../check.ts';
import { finalNumber, lastNumberIs, namesAnswer } from '../../grading/answers.ts';
import { RULES, followsFormat } from '../../grading/checks.ts';
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

const labeled = object({ text: string, label: string });

export const fewShotLabels = object({
	models: record(['gpt2', 'qwen'], modelRef),
	examples: array(labeled),
	conditions: array(
		object({ id: string, name: string, shown: array(string), labels: tuple(string, string) })
	),
	tests: array(labeled),
	/** results[model][condition][test]: the chance of each of the condition's two labels. */
	results: record(['gpt2', 'qwen'], dictionary(array(tuple(number, number))))
});
export type FewShotLabels = Infer<typeof fewShotLabels>;

export const PROBLEM_RUNS = ['plain', 'distracted', 'ignore', 'turns'] as const;
export type ProblemRun = (typeof PROBLEM_RUNS)[number];

const problemRun = object({
	messages: array(object({ role: string, content: string }))
});

const problem = derive(
	object({
		facts: tuple(string, string),
		question: string,
		distractor: string,
		answer: integer,
		runs: record(PROBLEM_RUNS, problemRun)
	}),
	// The model's answer is the number in its last reply; it's right if it's the problem's answer.
	(p) => {
		const graded = (k: ProblemRun) => {
			const answer = finalNumber(p.runs[k].messages.at(-1)?.content ?? '');
			return { ...p.runs[k], answer, correct: answer === String(p.answer) };
		};
		const runs = Object.fromEntries(PROBLEM_RUNS.map((k) => [k, graded(k)]));
		return { ...p, runs: runs as Record<ProblemRun, ReturnType<typeof graded>> };
	}
);

export const wordProblems = object({
	model: modelRef,
	ignoreInstruction: string,
	problems: array(problem)
});
export type WordProblems = Infer<typeof wordProblems>;

const chatMessages = array(object({ role: literal('user', 'assistant'), content: string }));

export const pushback = object({
	model: modelRef,
	pushback: string,
	hint: string,
	questions: array(
		derive(
			object({
				question: string,
				right: string,
				wrong: string,
				// Graded by hand (scripts/record/grades/prompts-pushback.json), with the reason.
				pushback: object({
					messages: chatMessages,
					verdict: literal('right', 'wrong', 'mixed'),
					reason: string
				}),
				hint: object({ messages: chatMessages })
			}),
			// With the wrong guess up front, a one-sentence reply that names the right answer kept it.
			(q) => {
				const kept = namesAnswer(q.hint.messages.at(-1)?.content ?? '', q.right);
				return {
					...q,
					hint: { ...q.hint, verdict: kept ? ('right' as const) : ('wrong' as const) }
				};
			}
		)
	)
});
export type Pushback = Infer<typeof pushback>;

export const manyRules = derive(
	object({
		model: modelRef,
		rules: array(string),
		counts: array(integer),
		notes: array(
			object({
				task: string,
				runs: array(object({ rules: array(integer), prompt: string, reply: string }))
			})
		)
	}),
	(d, path) => {
		d.rules.forEach((text, i) => {
			if (RULES[i]?.text !== text)
				throw new DataError(`${path}.rules[${i}]`, `"${RULES[i]?.text}"`);
		});
		const notes = d.notes.map((n) => ({
			...n,
			runs: n.runs.map((r) => ({ ...r, followed: r.rules.map((i) => RULES[i].kept(r.reply)) }))
		}));
		return { ...d, notes };
	}
);
export type ManyRules = Infer<typeof manyRules>;

const mathAnswer = object({ text: string });

export const systemPrompts = derive(
	object({
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
		math: array(
			object({ question: string, expected: number, default: mathAnswer, persona: mathAnswer })
		)
	}),
	// A sum is right when the last number in the reply is the product.
	(d) => ({
		...d,
		math: d.math.map((m) => ({
			...m,
			default: { ...m.default, correct: lastNumberIs(m.default.text, m.expected) },
			persona: { ...m.persona, correct: lastNumberIs(m.persona.text, m.expected) }
		}))
	})
);
export type SystemPrompts = Infer<typeof systemPrompts>;

export const steps = object({
	model: modelRef,
	conditions: array(object({ name: string, suffix: string })),
	puzzles: array(
		derive(
			object({
				question: string,
				expected: string,
				runs: array(
					object({
						condition: string,
						text: string,
						tokens: integer,
						stopped: boolean,
						// Graded by hand (scripts/record/grades/prompts-steps.json), with the reason.
						correct: boolean,
						reason: string
					})
				)
			}),
			(p) => ({ ...p, runs: p.runs.map((r, i) => ({ ...r, formatted: followsFormat(i, r.text) })) })
		)
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
