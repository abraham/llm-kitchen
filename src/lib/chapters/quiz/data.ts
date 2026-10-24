import type { Slug } from '#lib/curriculum/index.ts';
import type { Level } from '#lib/levels.ts';

export interface QuizQuestion {
	q: string;
	options: string[];
	answer: number;
	why: string;
	/** Chapters that explain the answer, linked after it and listed for review when it's missed. */
	chapters: Slug[];
	/** The explanation levels it suits; every level when absent. */
	levels?: readonly Level[];
}

/** In reading order, with at least one question from every Part (checked by a unit test). */
export const QUESTIONS: QuizQuestion[] = [
	{
		q: 'What does raising the temperature do when a model picks the next word?',
		options: [
			'Unlikely words get picked more often',
			'The model thinks for longer',
			'More words are added to its vocabulary',
			'The model runs faster'
		],
		answer: 0,
		why: 'Temperature spreads the probabilities out before one word is picked.',
		chapters: ['probability-and-sampling']
	},
	{
		q: 'Why might a model miscount the letters in “strawberry”?',
		options: [
			'It reads tokens, not letters',
			'It was never shown the word',
			'Counting is banned in training',
			'Its temperature is too high'
		],
		answer: 0,
		why: 'The word reaches it as one or a few token numbers.',
		chapters: ['tokens', 'quirks-and-limits']
	},
	{
		q: 'Where do a model’s weights come from?',
		options: [
			'Programmers type them in',
			'Training nudges every weight to make the right next token a little more likely',
			'They are copied from a dictionary',
			'They start random and stay that way'
		],
		answer: 1,
		why: 'Training measures how wrong each prediction is and nudges every weight to be a little less wrong.',
		chapters: ['learning-from-mistakes']
	},
	{
		q: 'How does attention help with “The trophy didn’t fit in the suitcase because it was too big”?',
		options: [
			'It looks up the answer online',
			'It lets each token pull in information from any earlier token',
			'It makes the vocabulary bigger',
			'It removes the word “it”'
		],
		answer: 1,
		why: 'Attention weights earlier tokens by relevance.',
		chapters: ['attention']
	},
	{
		q: 'What does the model itself produce each time it runs?',
		options: [
			'A whole reply',
			'Probabilities for the next token',
			'A search of the web',
			'A list of facts it checked'
		],
		answer: 1,
		why: 'One run gives probabilities for one next token; the reply is built by a loop.',
		chapters: ['generating-text']
	},
	{
		q: 'You round a model’s weights from 16 bits to 4 bits each. What happens?',
		options: [
			'It needs about a quarter of the memory, and coarse rounding can hurt its answers',
			'It learns new facts',
			'Its vocabulary shrinks to 16 tokens',
			'Nothing at all'
		],
		answer: 0,
		why: 'Each weight takes 4 bits instead of 16, so the weights take about a quarter of the memory; quality holds only while the rounding isn’t too coarse.',
		chapters: ['quantization']
	},
	{
		q: 'A small model drafts tokens and a big model checks them. How does the text compare with the big model writing alone?',
		options: [
			'It is exactly the same, written in fewer passes of the big model',
			'It is shorter',
			'It mixes the two models’ styles',
			'It is the small model’s text'
		],
		answer: 0,
		why: 'The big model checks every guess and keeps only the tokens it would have picked itself.',
		chapters: ['speculative-decoding']
	},
	{
		q: 'What does a reasoning model do differently from an ordinary chat model?',
		options: [
			'It looks answers up in a database',
			'It runs a separate logic engine',
			'It writes scratch work as tokens before answering',
			'It never makes mistakes'
		],
		answer: 2,
		why: 'It is still predicting tokens; it was trained to write its working first.',
		chapters: ['reasoning-models']
	},
	{
		q: 'You add four worked examples to a prompt. What changes inside the model?',
		options: [
			'Its weights are updated to learn the task',
			'Nothing but its context: attention can copy the pattern from the examples',
			'It switches to a different, specialized model',
			'Its vocabulary grows'
		],
		answer: 1,
		why: 'In-context learning uses the examples as context; no weights change.',
		chapters: ['few-shot']
	},
	{
		q: 'When an assistant uses a calculator, who actually runs it?',
		options: ['The model', 'The harness', 'The tokenizer', 'The user'],
		answer: 1,
		why: 'The model only writes a tool call as text; the harness runs it.',
		chapters: ['tools']
	},
	{
		q: 'An agent re-sends its whole, growing conversation on every call. Why is that often cheaper than it sounds?',
		options: [
			'The model remembers the earlier calls',
			'The provider reuses its work on the unchanged start of the prompt',
			'The harness compresses the text',
			'Long prompts are free'
		],
		answer: 1,
		why: 'Prompt caching keeps the keys and values for a prompt’s exact start; the model itself remembers nothing.',
		chapters: ['caching']
	},
	{
		q: 'Why can a hidden line in a web page change what a summarizer writes?',
		options: [
			'The page breaks into the computer running the model',
			'The model reads the page and your request as one stream of text',
			'Web pages were part of its training',
			'It can’t; models ignore instructions in documents'
		],
		answer: 1,
		why: 'Nothing marks which words came from you and which from the page.',
		chapters: ['prompt-injection']
	},
	{
		q: 'A web page tells the agent to delete your files. What stops it?',
		options: [
			'The model always ignores web pages',
			'Guardrails in the harness, like asking you first',
			'The context window',
			'Nothing can help'
		],
		answer: 1,
		why: 'To the model, the page is just more text; the harness has to supply the safety.',
		chapters: ['trust-and-guardrails']
	},
	{
		q: 'Why can BERT fill in a blank in the middle of a sentence better than GPT-2?',
		options: [
			'It has a bigger vocabulary',
			'Its attention can look at the words after the blank too',
			'It was trained on more text',
			'It uses a higher temperature'
		],
		answer: 1,
		why: 'An encoder lets every token see every other token, both before and after.',
		chapters: ['encoders']
	}
];
