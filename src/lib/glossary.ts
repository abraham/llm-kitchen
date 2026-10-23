export interface GlossaryEntry {
	term: string;
	definition: string;
	/** Chapter number that introduces the term. */
	chapter: number;
}

export const GLOSSARY = {
	llm: {
		term: 'large language model (LLM)',
		definition: 'A program trained on a lot of text to predict the next piece of text.',
		chapter: 0
	},
	bigram: {
		term: 'bigram model',
		definition: 'A model that predicts the next word using only the one word before it.',
		chapter: 2
	},
	distribution: {
		term: 'probability distribution',
		definition: 'A list of possible outcomes with how likely each one is. The chances add up to 1.',
		chapter: 3
	},
	sampling: {
		term: 'sampling',
		definition: 'Picking one outcome at random, where likelier outcomes get picked more often.',
		chapter: 3
	},
	temperature: {
		term: 'temperature',
		definition:
			'A setting that sharpens (low) or flattens (high) the probabilities before sampling.',
		chapter: 3
	},
	token: {
		term: 'token',
		definition:
			'A chunk of text the model reads and writes, often a word or part of a word, with its own ID number.',
		chapter: 4
	},
	bpe: {
		term: 'byte pair encoding (BPE)',
		definition:
			'A way to build a token vocabulary by repeatedly merging the most frequent pair of symbols.',
		chapter: 4
	},
	embedding: {
		term: 'embedding',
		definition: 'A list of numbers (a vector) that stands for a token, learned during training.',
		chapter: 5
	},
	neuron: {
		term: 'neuron',
		definition:
			'A small unit that multiplies its inputs by weights, adds them up, and passes the result through a function.',
		chapter: 6
	},
	weight: {
		term: 'weight',
		definition: 'A number inside a network that training adjusts.',
		chapter: 6
	},
	loss: {
		term: 'loss',
		definition: 'A score for how wrong the model’s predictions are. Training tries to lower it.',
		chapter: 7
	},
	'gradient-descent': {
		term: 'gradient descent',
		definition:
			'Training by repeatedly nudging every weight in the direction that lowers the loss.',
		chapter: 7
	},
	'context-window': {
		term: 'context window',
		definition: 'The maximum number of tokens a model can look at at once.',
		chapter: 8
	},
	attention: {
		term: 'attention',
		definition:
			'The step where each token gathers information from the earlier tokens it finds relevant.',
		chapter: 9
	},
	'attention-head': {
		term: 'attention head',
		definition:
			'One attention pattern with its own weights. Each layer runs several side by side; GPT-2 small has 12 per layer.',
		chapter: 9
	},
	'residual-stream': {
		term: 'residual stream',
		definition:
			'The running vector for each token that every block reads from and adds its result to.',
		chapter: 10
	},
	transformer: {
		term: 'transformer',
		definition:
			'The model design used by modern LLMs: a stack of repeated blocks built around attention.',
		chapter: 10
	},
	'scaling-law': {
		term: 'scaling law',
		definition:
			'A formula, fitted to many training runs, that predicts how much a model improves as it gets bigger or reads more text.',
		chapter: 12
	},
	'base-model': {
		term: 'base model',
		definition:
			'A model trained only to predict the next token of ordinary text, before any tuning to act as an assistant.',
		chapter: 13
	},
	'chat-template': {
		term: 'chat template',
		definition:
			'The fixed text format, with special marker tokens, that turns a conversation into one piece of text for the model.',
		chapter: 13
	},
	hallucination: {
		term: 'hallucination',
		definition: 'Fluent, confident text that is false or made up.',
		chapter: 14
	},
	harness: {
		term: 'harness',
		definition:
			'The ordinary code around a model that builds its prompt, calls it, and acts on its output.',
		chapter: 15
	},
	'tool-call': {
		term: 'tool call',
		definition:
			'Text the model writes in an agreed format asking the harness to run a tool, such as a calculator.',
		chapter: 16
	},
	agent: {
		term: 'agent',
		definition:
			'A model called in a loop by a harness that runs its tool calls and feeds the results back in.',
		chapter: 17
	},
	'prompt-injection': {
		term: 'prompt injection',
		definition:
			'Instructions hidden in text the model reads (like a web page) that try to override the real instructions.',
		chapter: 19
	}
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;
