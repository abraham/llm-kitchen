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
		chapters: ['learning-from-mistakes'],
		levels: ['standard', 'deep']
	},
	{
		q: 'How does a model get good at guessing the next word?',
		options: [
			'It practices on lots of text and is nudged a little after each mistake',
			'Programmers write a rule for every word',
			'It looks each word up in a dictionary',
			'It is born knowing the language'
		],
		answer: 0,
		why: 'Training checks each guess against the real next word and adjusts the model to be a little less wrong.',
		chapters: ['learning-from-mistakes'],
		levels: ['simple']
	},
	{
		q: 'What does a language model’s training loss, the cross-entropy, measure?',
		options: [
			'The average of −ln p over the real next tokens: how surprised the model was',
			'How many weights changed in the last step',
			'The distance between two embeddings',
			'How many tokens the model has read'
		],
		answer: 0,
		why: 'It averages the surprise, −ln p, at each real next token; making the right tokens likelier lowers it.',
		chapters: ['learning-from-mistakes'],
		levels: ['deep']
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
		q: 'When the big model samples, how does guess-and-check keep its text exactly as likely as before?',
		options: [
			'It keeps a guess with chance min(1, p/q) and redraws a rejected one from what’s left over',
			'It only accepts guesses the small model was sure of',
			'It averages the two models’ probabilities',
			'It lowers the temperature of both models'
		],
		answer: 0,
		why: 'Keeping with chance min(1, p/q) and redrawing from max(0, p − q), rescaled, gives exactly the big model’s probabilities.',
		chapters: ['speculative-decoding'],
		levels: ['deep']
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
		chapters: ['few-shot'],
		levels: ['standard', 'deep']
	},
	{
		q: 'You put four examples in a prompt. Does the model learn anything that lasts?',
		options: [
			'No: it uses the examples while it reads this prompt, and the model itself doesn’t change',
			'Yes: it saves the examples for every future chat',
			'Yes: it retrains itself on them',
			'No: models ignore examples'
		],
		answer: 0,
		why: 'The examples only shape this one prompt; nothing in the model is changed.',
		chapters: ['few-shot'],
		levels: ['simple']
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
		chapters: ['caching'],
		levels: ['standard', 'deep']
	},
	{
		q: 'An agent sends its whole conversation again on every call. What keeps that from being as slow and costly as it sounds?',
		options: [
			'The provider saves its work on the start of the prompt and reuses it',
			'The model remembers what it read last time',
			'The conversation is sent as a picture',
			'Nothing: every call costs the same as the first'
		],
		answer: 0,
		why: 'Prompt caching reuses the work on a prompt’s unchanged start; the model itself remembers nothing.',
		chapters: ['caching'],
		levels: ['simple']
	},
	{
		q: 'Without a KV cache, how does the work for n new tokens grow?',
		options: [
			'With the square of n, because every step reruns all the text so far',
			'In step with n',
			'It stays the same however many tokens',
			'It shrinks as the text gets longer'
		],
		answer: 0,
		why: 'Step t reruns all p + t tokens, so n steps take n·p + n(n − 1)/2 token passes.',
		chapters: ['caching'],
		levels: ['deep']
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
	},
	{
		q: 'Mixtral sends each token to 2 of its 8 experts. Why does a token use 13 of its 47 billion weights, more than a quarter?',
		options: [
			'Attention and the embeddings are shared by every token; only the MLPs are split',
			'The router itself is half the model',
			'Every expert runs a little for every token',
			'The quarter is rounded up to be safe'
		],
		answer: 0,
		why: 'Only the MLPs are split into experts, so about 1.7 billion shared weights run for every token.',
		chapters: ['mixture-of-experts'],
		levels: ['deep']
	}
];
