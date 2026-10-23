export interface Part {
	/** Roman numeral, or null for the closing wrap-up. */
	number: string | null;
	title: string;
}

export interface ChapterMeta {
	number: number;
	slug: string;
	title: string;
	part: Part;
	/** Earlier chapters this one builds on, shown in its Ingredients box. */
	buildsOn: number[];
	/** One or two sentences for the meta description and link previews. */
	description: string;
}

export const PARTS = {
	prediction: { number: 'I', title: 'Prediction' },
	representation: { number: 'II', title: 'Representation' },
	learning: { number: 'III', title: 'Learning' },
	context: { number: 'IV', title: 'Context' },
	together: { number: 'V', title: 'Putting it together' },
	prompting: { number: 'VI', title: 'Prompt engineering' },
	harnesses: { number: 'VII', title: 'Harnesses' },
	others: { number: 'VIII', title: 'Other kinds of models' },
	wrapup: { number: null, title: 'Wrap-up' }
} as const satisfies Record<string, Part>;

type Row = [
	slug: string,
	title: string,
	part: keyof typeof PARTS,
	buildsOn: number[],
	description: string
];

// prettier-ignore
const rows: Row[] = [
	['guessing-game', 'The guessing game', 'prediction', [],
		'Guess the next word yourself, then compare with a real model. It is the one game every large language model is built to play.'],
	['predicting-by-counting', 'Predicting by counting', 'prediction', [0],
		'The simplest way to predict: count which word follows which. See a bigram model at work, and what it gets right and wrong.'],
	['probability-and-sampling', 'Probability and sampling', 'prediction', [1],
		"A model's output is a chance for every possible next word. Spin the wheel to pick one, and see how temperature changes the odds."],
	['text-is-numbers', 'Text is just numbers', 'representation', [0],
		'Computers only store numbers, so text has to become numbers first. See how Unicode and UTF-8 turn every character into bytes.'],
	['tokens', "Tokens: the model's alphabet", 'representation', [3],
		'Models read tokens, not letters or whole words. Type anything to see how GPT-2 splits it, and why that causes odd mistakes.'],
	['embeddings', 'Meaning as position', 'representation', [4],
		"Each token becomes a list of numbers: a point where similar meanings sit close together. Explore a real model's map of words."],
	['a-neuron', 'A neuron', 'learning', [5],
		"The building block of a neural network: multiply, add up, and squash. Change one neuron's weights and watch its output move."],
	['learning-from-mistakes', 'Learning from mistakes', 'learning', [1, 6],
		'Training measures how wrong a prediction is, then nudges every weight to be a little less wrong. Watch a small network learn.'],
	['the-context-problem', 'The context problem', 'context', [1],
		'Change one word and the meaning of a whole sentence changes. Why predicting well means reading every earlier word, not just the last.'],
	['attention', 'Attention', 'context', [5, 8],
		'Attention lets each token look back at the earlier tokens that matter to it. See how a token decides where to look.'],
	['the-transformer-block', 'The transformer block', 'context', [6, 9],
		'Token vectors, attention, and layers of neurons put together: the transformer block, stacked many times in every large language model.'],
	['generating-text', 'Generating text', 'together', [2, 10],
		'A model writes by predicting one token, adding it to the text, and going again. Step through GPT-2 writing one token at a time.'],
	['scale', 'Scale', 'together', [7, 11],
		"Today's largest models use the same recipe as GPT-2, only far bigger. See how they improve smoothly with more weights and more text."],
	['quantization', 'Fewer bits per number', 'together', [3, 12],
		'A model is billions of numbers, and each takes space. See what rounding them to fewer bits saves, and when the answers start to break.'],
	['speculative-decoding', 'Guessing ahead', 'together', [2, 11, 12],
		'A small model guesses the next few tokens and a big one checks them all in one pass. See how that speeds up writing without changing it.'],
	['predictor-to-assistant', 'From predictor to assistant', 'together', [11],
		'A base model only continues text. See how a chat template and further tuning turn a text predictor into an assistant.'],
	['quirks-and-limits', 'Quirks and limits', 'together', [4, 15],
		'Made-up facts, knowledge frozen in time, trouble with letters, and answers that shift with wording all follow from predicting tokens.'],
	['reasoning-models', 'Thinking before answering', 'together', [11, 15, 16],
		'Reasoning models write out their working before they answer, using their own output as scrap paper. See when that helps.'],
	['prompts-as-documents', 'A prompt is the start of a document', 'prompting', [2, 8, 9, 15],
		'To a model, a prompt is the start of a document to continue. Change the opening and watch GPT-2 write a different kind of text.'],
	['few-shot', 'Learning from examples in the prompt', 'prompting', [9, 18],
		'Show a model a few examples and it follows the pattern, even a rule nobody could guess. See few-shot prompting at work.'],
	['instructions-and-roles', 'Instructions, roles, and the system prompt', 'prompting', [15, 18],
		'System prompts and roles are just text in the chat template. See how one model answers the same question under different system prompts.'],
	['steps-and-structure', 'Asking for steps and structure', 'prompting', [11, 17],
		'Asking a model to think step by step gives it room to work, and asking for a fixed format makes its answers usable by programs.'],
	['where-prompts-break', 'Where prompts break', 'prompting', [16, 19],
		'The order of examples, the layout, and where an instruction sits can all change the answer. See how fragile prompts are, and what helps.'],
	['the-model-is-not-the-product', 'The model is not the product', 'harnesses', [15, 20],
		'A chat app wraps the model in a harness: a system prompt, a template, and code. See what the model really receives in a conversation.'],
	['tools', 'Tools', 'harnesses', [21, 23],
		'Models are poor at arithmetic one token at a time, but a tool call is just text that code can act on. See how tools fill the gap.'],
	['the-agent-loop', 'The agent loop', 'harnesses', [11, 24],
		'An agent is a model calling tools in a loop, where each step depends on the last. Follow a real model through a multi-step task.'],
	['managing-the-context', 'Managing the context', 'harnesses', [5, 8, 25],
		'Every tool result and reply is added to the prompt, so it keeps growing. See three ways an agent can make room, and what each forgets.'],
	['caching', 'Caching: reusing the work', 'harnesses', [9, 11, 25],
		'A model can reuse the work it already did on the start of a prompt. See the KV cache, and why harnesses keep their prompts\' openings fixed.'],
	['prompt-injection', 'Prompt injection', 'harnesses', [20, 22, 24],
		'Text a model reads can carry instructions of its own. See why a model follows them, and how well defenses written into the prompt hold up.'],
	['trust-and-guardrails', 'Trust and guardrails', 'harnesses', [25, 28],
		'A web page can hide instructions that an agent then follows. See prompt injection happen, and what different guardrails change.'],
	['encoders', 'Reading both ways', 'others', [5, 9],
		'Encoder models read the whole text at once, in both directions. That makes them good at filling blanks and understanding, not writing.'],
	['mixture-of-experts', 'Many experts', 'others', [6, 10],
		'A mixture of experts sends each token through a few small sub-networks instead of all of them, so a model can grow without every token costing more.'],
	['recurrent-models', 'Remembering without attention', 'others', [7, 8, 27],
		'Recurrent models carry a running memory instead of looking back at every token. See how they work, and what they forget.'],
	['seeing-pictures', 'Seeing pictures', 'others', [5, 10],
		'Cut a picture into patches and a transformer can read it like text. See CLIP, a real model, match simple pictures with captions.'],
	['diffusion', 'Painting from noise', 'others', [7, 11],
		'Image models start from random noise and remove a little at a time. See how diffusion turns static into a picture, step by step.'],
	['recap', 'Recap: the whole picture', 'wrapup', [],
		'The whole picture in one place: tokens, vectors, attention, generation, assistants, agents, and the other kinds of models.'],
	['end-to-end', 'From message to reply', 'wrapup', [],
		'Follow one message through every stage, from the prompt the harness builds to the tokens the model picks and the tool it calls.'],
	['picking-a-model', 'Picking a model', 'wrapup', [12, 13, 14, 15, 27, 31, 33],
		'Model names pack in size, tuning, experts, and bits per weight. Learn to read them, and see whether a model fits your device.'],
	['quiz', 'Check yourself', 'wrapup', [],
		'Fourteen questions, at least one from every Part, with the chapter to revisit for each one you miss.']
];

/** The full curriculum, in reading order. Chapter files are `NN-slug.svx` in this folder. */
export const CURRICULUM: readonly ChapterMeta[] = rows.map(
	([slug, title, part, buildsOn, description], number) => ({
		number,
		slug,
		title,
		part: PARTS[part],
		buildsOn,
		description
	})
);

export function chapterFileName(chapter: ChapterMeta): string {
	return `${String(chapter.number).padStart(2, '0')}-${chapter.slug}.svx`;
}

/** "Part VIII: Other kinds of models", or just the title for the unnumbered wrap-up. */
export function partLabel(part: Part, separator = ': '): string {
	return part.number ? `Part ${part.number}${separator}${part.title}` : part.title;
}

export function findChapter(slug: string): ChapterMeta | undefined {
	return CURRICULUM.find((chapter) => chapter.slug === slug);
}

export function chapterByNumber(number: number): ChapterMeta {
	const chapter = CURRICULUM[number];
	if (!chapter) throw new Error(`No chapter ${number}`);
	return chapter;
}
