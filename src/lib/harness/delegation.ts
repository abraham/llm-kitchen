/**
 * The toy in "Splitting the work": how big each model call's prompt is when one agent does a job
 * alone, and when a lead agent hands its subtasks to helpers that each start fresh.
 */

/** Prompt sizes in tokens. Made up, close to the recorded run in "The agent loop". */
export const SIZES = {
	/** The first prompt of the only agent, or of the lead: instructions, tools, and the task. */
	start: 300,
	/** What one tool call and its result add to an agent's prompt. */
	toolResult: 90,
	/** A helper's first prompt: its own short instructions and one subtask. */
	helperStart: 150,
	/** What the lead's prompt gains per subtask: the handoff it wrote and the helper's summary. */
	perSubtask: 80
} as const;

export interface Job {
	subtasks: number;
	/** Tool calls each subtask needs. */
	steps: number;
}

export interface Call {
	who: 'agent' | 'lead' | 'helper';
	/** For a helper's call: which helper, from 0. */
	helper?: number;
	/** Tokens this call reads. */
	prompt: number;
}

/** One agent does every tool call in one conversation, then answers. */
export function oneAgent({ subtasks, steps }: Job): Call[] {
	return Array.from({ length: subtasks * steps + 1 }, (_, k) => ({
		who: 'agent',
		prompt: SIZES.start + k * SIZES.toolResult
	}));
}

/**
 * The lead writes every handoff in one call, each helper runs its own loop from a fresh prompt,
 * and the lead answers from their summaries.
 */
export function splitWork({ subtasks, steps }: Job): Call[] {
	const helpers = Array.from({ length: subtasks }, (_, helper) =>
		Array.from({ length: steps + 1 }, (_, k): Call => ({
			who: 'helper',
			helper,
			prompt: SIZES.helperStart + k * SIZES.toolResult
		}))
	).flat();
	return [
		{ who: 'lead', prompt: SIZES.start },
		...helpers,
		{ who: 'lead', prompt: SIZES.start + subtasks * SIZES.perSubtask }
	];
}

export interface Totals {
	calls: number;
	/** Calls that have to wait for the one before; split work runs its helpers at the same time. */
	inARow: number;
	largest: number;
	read: number;
}

export function totals(calls: readonly Call[]): Totals {
	const helperCalls = calls.filter((c) => c.who === 'helper');
	const helpers = new Set(helperCalls.map((c) => c.helper)).size;
	const nonHelper = calls.length - helperCalls.length;
	return {
		calls: calls.length,
		inARow: nonHelper + (helpers ? helperCalls.length / helpers : 0),
		largest: Math.max(...calls.map((c) => c.prompt)),
		read: calls.reduce((a, c) => a + c.prompt, 0)
	};
}
