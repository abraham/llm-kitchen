/**
 * Three ways to run a task that needs several tool calls, in made-up prompt sizes close to the
 * recorded agent loop (301 tokens to start, about 90 per tool result).
 */
export const DESIGN_SIZES = { start: 300, toolResult: 90, program: 60 } as const;

export type Design = 'loop' | 'code' | 'plan';

export interface DesignCost {
	/** Model calls, the first prompt each read included. */
	calls: number;
	/** Every call's prompt, added up. */
	read: number;
	/** Can the model look at each tool result before choosing the next step? */
	seesEachResult: boolean;
	/** Does the harness run code the model wrote? */
	runsModelCode: boolean;
}

/** `steps` tool calls, done three ways. */
export function designCost(design: Design, steps: number): DesignCost {
	const { start, toolResult, program } = DESIGN_SIZES;
	switch (design) {
		// One call per step plus the answer; each prompt holds every earlier result.
		case 'loop':
			return {
				calls: steps + 1,
				read: (steps + 1) * start + (toolResult * steps * (steps + 1)) / 2,
				seesEachResult: true,
				runsModelCode: false
			};
		// One call writes a program that makes every tool call; one more reads what it printed.
		case 'code':
			return { calls: 2, read: 2 * start + program, seesEachResult: false, runsModelCode: true };
		// One call writes the plan; code runs it; one call reads every result and answers.
		case 'plan':
			return {
				calls: 2,
				read: 2 * start + steps * toolResult,
				seesEachResult: false,
				runsModelCode: false
			};
	}
}
