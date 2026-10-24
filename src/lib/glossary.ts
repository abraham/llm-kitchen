import type { Slug } from '#lib/curriculum/index.ts';

export interface GlossaryEntry {
	term: string;
	definition: string;
	/** Shorter and without jargon, for Simple; `definition` when absent. */
	simple?: string;
	/** The precise version, for In depth; `definition` when absent. */
	deep?: string;
	/** The chapter that introduces the term. */
	chapter: Slug;
}

export const GLOSSARY = {
	llm: {
		term: 'large language model (LLM)',
		definition: 'A program trained on a lot of text to predict the next piece of text.',
		chapter: 'guessing-game'
	},
	bigram: {
		term: 'bigram model',
		definition: 'A model that predicts the next word using only the one word before it.',
		chapter: 'predicting-by-counting'
	},
	distribution: {
		term: 'probability distribution',
		definition: 'A list of possible outcomes with how likely each one is. The chances add up to 1.',
		chapter: 'probability-and-sampling'
	},
	sampling: {
		term: 'sampling',
		definition: 'Picking one outcome at random, where likelier outcomes get picked more often.',
		chapter: 'probability-and-sampling'
	},
	temperature: {
		term: 'temperature',
		definition:
			'A setting that sharpens (low) or flattens (high) the probabilities before sampling.',
		chapter: 'probability-and-sampling'
	},
	token: {
		term: 'token',
		definition:
			'A chunk of text the model reads and writes, often a word or part of a word, with its own ID number.',
		chapter: 'tokens'
	},
	bpe: {
		term: 'byte pair encoding (BPE)',
		definition:
			'A way to build a token vocabulary by repeatedly merging the most frequent pair of symbols.',
		chapter: 'tokens'
	},
	embedding: {
		term: 'embedding',
		definition: 'A list of numbers (a vector) that stands for a token, learned during training.',
		chapter: 'embeddings'
	},
	neuron: {
		term: 'neuron',
		definition:
			'A small unit that multiplies its inputs by weights, adds them up, and passes the result through a function.',
		chapter: 'a-neuron'
	},
	weight: {
		term: 'weight',
		definition: 'A number inside a network that training adjusts.',
		chapter: 'a-neuron'
	},
	loss: {
		term: 'loss',
		definition: 'A score for how wrong the model’s predictions are. Training tries to lower it.',
		chapter: 'learning-from-mistakes'
	},
	'gradient-descent': {
		term: 'gradient descent',
		definition:
			'Training by repeatedly nudging every weight in the direction that lowers the loss.',
		chapter: 'learning-from-mistakes'
	},
	'context-window': {
		term: 'context window',
		definition: 'The maximum number of tokens a model can look at at once.',
		chapter: 'the-context-problem'
	},
	attention: {
		term: 'attention',
		definition:
			'The step where each token gathers information from the earlier tokens it finds relevant.',
		chapter: 'attention'
	},
	'position-vector': {
		term: 'position vector',
		definition:
			'A learned vector for each place in the text, added to the token’s vector so the model knows word order.',
		chapter: 'attention'
	},
	'attention-head': {
		term: 'attention head',
		definition:
			'One attention pattern with its own weights. Each layer runs several side by side; GPT-2 small has 12 per layer.',
		chapter: 'attention'
	},
	'residual-stream': {
		term: 'residual stream',
		definition:
			'The running vector for each token that every block reads from and adds its result to.',
		chapter: 'the-transformer-block'
	},
	transformer: {
		term: 'transformer',
		definition:
			'The model design used by modern LLMs: a stack of repeated blocks built around attention.',
		chapter: 'the-transformer-block'
	},
	'scaling-law': {
		term: 'scaling law',
		definition:
			'A formula, fitted to many training runs, that predicts how much a model improves as it gets bigger or reads more text.',
		chapter: 'scale'
	},
	quantization: {
		term: 'quantization',
		definition:
			'Storing a model’s numbers with fewer bits each, by rounding them to a small set of allowed values, so the model takes less memory.',
		chapter: 'quantization'
	},
	'quantization-aware-training': {
		term: 'quantization-aware training (QAT)',
		definition:
			'Training a model with the rounding of quantization already in place, so it learns weights that still work after rounding.',
		chapter: 'quantization'
	},
	'speculative-decoding': {
		term: 'speculative decoding',
		definition:
			'Letting a small model guess the next few tokens and having the big model check them all in one pass, so it writes the same text faster.',
		chapter: 'speculative-decoding'
	},
	'base-model': {
		term: 'base model',
		definition:
			'A model trained only to predict the next token of ordinary text, before any tuning to act as an assistant.',
		chapter: 'predictor-to-assistant'
	},
	'chat-template': {
		term: 'chat template',
		definition:
			'The fixed text format, with special marker tokens, that turns a conversation into one piece of text for the model.',
		chapter: 'predictor-to-assistant'
	},
	'fine-tuning': {
		term: 'fine-tuning',
		definition:
			'Training an existing model further on examples of one task, so it does that task better.',
		chapter: 'predictor-to-assistant'
	},
	lora: {
		term: 'LoRA',
		definition:
			'Fine-tuning that freezes a model’s weights and trains small add-on tables next to some of its big tables of weights.',
		chapter: 'predictor-to-assistant'
	},
	distillation: {
		term: 'distillation',
		definition:
			'Training a smaller model, the student, to copy the outputs of a bigger one, the teacher.',
		chapter: 'predictor-to-assistant'
	},
	hallucination: {
		term: 'hallucination',
		definition: 'Fluent, confident text that is false or made up.',
		chapter: 'quirks-and-limits'
	},
	harness: {
		term: 'harness',
		definition:
			'The ordinary code around a model that builds its prompt, calls it, and acts on its output.',
		chapter: 'the-model-is-not-the-product'
	},
	'system-prompt': {
		term: 'system prompt',
		definition:
			'Instructions in a slot at the start of the chat template that apply to the whole conversation; in apps, usually hidden from the user.',
		chapter: 'instructions-and-roles'
	},
	retrieval: {
		term: 'retrieval',
		definition:
			'Finding the stored text most relevant to a question (often by comparing embeddings) and putting it into the prompt.',
		chapter: 'managing-the-context'
	},
	'tool-call': {
		term: 'tool call',
		definition:
			'Text the model writes in an agreed format asking the harness to run a tool, such as a calculator.',
		chapter: 'tools'
	},
	mcp: {
		term: 'Model Context Protocol (MCP)',
		definition:
			'An open standard for how a harness finds tools offered by another program and passes the model’s calls to them.',
		chapter: 'tools'
	},
	agent: {
		term: 'agent',
		definition:
			'A model called in a loop by a harness that runs its tool calls and feeds the results back in.',
		chapter: 'the-agent-loop'
	},
	'kv-cache': {
		term: 'KV cache',
		definition:
			'The keys and values a model has already worked out for earlier tokens, stored so each new token only has to compute its own.',
		chapter: 'caching'
	},
	'prompt-caching': {
		term: 'prompt caching',
		definition:
			'A provider keeping the KV cache for the start of a prompt, so a later prompt that starts the same way is cheaper and faster.',
		chapter: 'caching'
	},
	'prompt-injection': {
		term: 'prompt injection',
		definition:
			'Instructions hidden in text the model reads (like a web page) that try to override the real instructions.',
		chapter: 'prompt-injection'
	},
	encoder: {
		term: 'encoder',
		definition:
			'A transformer that reads the whole text at once, words before and after, to understand it rather than continue it.',
		chapter: 'encoders'
	},
	'mixture-of-experts': {
		term: 'mixture of experts (MoE)',
		definition:
			'A model whose MLPs are split into many experts, with a router sending each token to only a few of them.',
		chapter: 'mixture-of-experts'
	},
	'recurrent-model': {
		term: 'recurrent model',
		definition:
			'A model that reads one token at a time and carries a fixed-size memory from each token to the next.',
		chapter: 'recurrent-models'
	},
	multimodal: {
		term: 'multimodal model',
		definition: 'A model that takes in more than one kind of input, such as text and pictures.',
		chapter: 'seeing-pictures'
	},
	diffusion: {
		term: 'diffusion model',
		definition:
			'A model that makes pictures (or other data) by starting from random noise and removing a little of it at each step.',
		chapter: 'diffusion'
	},
	'reasoning-model': {
		term: 'reasoning model',
		definition:
			'A language model trained to write out its working before it answers, spending more tokens to get more right.',
		chapter: 'reasoning-models'
	},
	'prompt-engineering': {
		term: 'prompt engineering',
		definition:
			'Choosing the text a model continues so that the answer you want becomes the likely continuation.',
		chapter: 'prompts-as-documents'
	},
	'in-context-learning': {
		term: 'in-context learning',
		definition:
			'A model picking up a task from examples in its prompt, without any change to its weights.',
		chapter: 'few-shot'
	},
	'chain-of-thought': {
		term: 'chain of thought',
		definition: 'Working written out step by step before the answer, by the model itself.',
		chapter: 'steps-and-structure'
	}
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;
