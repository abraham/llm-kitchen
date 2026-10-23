/** Where a stage runs: in the harness before or after the model, or inside the model's token loop. */
export type StageGroup = 'before' | 'model' | 'after';

export interface Stage {
	id: string;
	name: string;
	group: StageGroup;
	/** What happens at this stage, in one or two sentences. */
	what: string;
	/** Chapters that explain the stage, linked from its box. */
	chapters: number[];
}

/** One message, in the order the pieces run (checked by a unit test to link every Part I–VII). */
export const STAGES: Stage[] = [
	{
		id: 'message',
		name: 'You type a message',
		group: 'before',
		what: 'The app shows a chat, but nothing has reached the model yet. Your message is just text in the app.',
		chapters: [23]
	},
	{
		id: 'prompt',
		name: 'The harness builds the prompt',
		group: 'before',
		what: 'The harness wraps your message in one long document: a system prompt, the tool descriptions, the earlier turns, and chat markers around each turn.',
		chapters: [15, 18, 20, 23]
	},
	{
		id: 'cache',
		name: 'Reuse the cached start',
		group: 'before',
		what: 'If the start of the prompt exactly matches one the provider saw recently, its work on that start is reused instead of redone.',
		chapters: [27]
	},
	{
		id: 'tokens',
		name: 'Text becomes tokens',
		group: 'model',
		what: 'The tokenizer splits the prompt into tokens, each a number from the model’s vocabulary.',
		chapters: [3, 4]
	},
	{
		id: 'vectors',
		name: 'Tokens become vectors',
		group: 'model',
		what: 'Each token number is looked up as a vector. GPT-2 also adds a vector for the token’s position, so word order isn’t lost.',
		chapters: [5, 10]
	},
	{
		id: 'blocks',
		name: 'Transformer blocks',
		group: 'model',
		what: 'A stack of blocks refines every vector. In each, attention pulls in information from earlier tokens, and a small network of neurons works on the result.',
		chapters: [6, 8, 9, 10]
	},
	{
		id: 'probabilities',
		name: 'A probability for every token',
		group: 'model',
		what: 'The last token’s final vector is turned into a score for every token in the vocabulary, and the scores into probabilities.',
		chapters: [1, 2]
	},
	{
		id: 'pick',
		name: 'Pick one token',
		group: 'model',
		what: 'One token is picked from those probabilities. Temperature decides how often a less likely token wins.',
		chapters: [2]
	},
	{
		id: 'append',
		name: 'Append and go again',
		group: 'model',
		what: 'The picked token is added to the end and the model runs again, reusing the earlier tokens’ keys and values (the KV cache). The loop stops at an end-of-turn token. A reasoning model writes its scratch work in this loop too.',
		chapters: [11, 17, 27]
	},
	{
		id: 'read',
		name: 'The harness reads the reply',
		group: 'after',
		what: 'The harness checks what the model wrote. Plain text is a reply. A tool call, written in the format the tool descriptions asked for, is a request.',
		chapters: [24]
	},
	{
		id: 'tool',
		name: 'Check and run the tool',
		group: 'after',
		what: 'Guardrails decide whether the call may run. If it may, the harness runs it, adds the call and its result to the prompt, and calls the model again: the agent loop. The result is text from outside, so it is untrusted.',
		chapters: [25, 28, 29]
	},
	{
		id: 'context',
		name: 'Keep the context in budget',
		group: 'after',
		what: 'Every call re-sends the growing conversation. When it gets too long, the harness trims, summarizes, or retrieves only the relevant parts.',
		chapters: [26]
	},
	{
		id: 'reply',
		name: 'You see the reply',
		group: 'after',
		what: 'When the model answers without a tool call, the harness shows that text as the reply. The tool call and result stay hidden in the prompt.',
		chapters: [23]
	}
];

/** Other kinds of models, and which piece of the recipe each one changes. */
export const VARIANTS: { chapter: number; changes: string }[] = [
	{ chapter: 30, changes: 'attention looks both ways' },
	{ chapter: 31, changes: 'only some of the network runs per token' },
	{ chapter: 32, changes: 'a fixed-size memory replaces attention' },
	{ chapter: 33, changes: 'patches of a picture become tokens' },
	{ chapter: 34, changes: 'the whole output is refined from noise' }
];
