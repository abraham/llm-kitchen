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
}

export const PARTS = {
	prediction: { number: 'I', title: 'Prediction' },
	representation: { number: 'II', title: 'Representation' },
	learning: { number: 'III', title: 'Learning' },
	context: { number: 'IV', title: 'Context' },
	together: { number: 'V', title: 'Putting it together' },
	harnesses: { number: 'VI', title: 'Harnesses' },
	others: { number: 'VII', title: 'Other kinds of models' },
	prompting: { number: 'VIII', title: 'Prompt engineering' },
	wrapup: { number: null, title: 'Wrap-up' }
} as const satisfies Record<string, Part>;

type Row = [slug: string, title: string, part: keyof typeof PARTS, buildsOn: number[]];

// prettier-ignore
const rows: Row[] = [
	['guessing-game', 'The guessing game', 'prediction', []],
	['text-is-numbers', 'Text is just numbers', 'prediction', [0]],
	['predicting-by-counting', 'Predicting by counting', 'prediction', [0, 1]],
	['probability-and-sampling', 'Probability and sampling', 'prediction', [2]],
	['tokens', "Tokens: the model's alphabet", 'representation', [1]],
	['embeddings', 'Meaning as position', 'representation', [4]],
	['a-neuron', 'A neuron', 'learning', [5]],
	['learning-from-mistakes', 'Learning from mistakes', 'learning', [2, 6]],
	['the-context-problem', 'The context problem', 'context', [2]],
	['attention', 'Attention', 'context', [5, 8]],
	['the-transformer-block', 'The transformer block', 'context', [6, 9]],
	['generating-text', 'Generating text', 'together', [3, 10]],
	['scale', 'Scale', 'together', [7, 11]],
	['predictor-to-assistant', 'From predictor to assistant', 'together', [11]],
	['quirks-and-limits', 'Quirks and limits', 'together', [4, 13]],
	['the-model-is-not-the-product', 'The model is not the product', 'harnesses', [13]],
	['tools', 'Tools', 'harnesses', [15]],
	['the-agent-loop', 'The agent loop', 'harnesses', [11, 16]],
	['managing-the-context', 'Managing the context', 'harnesses', [5, 8, 17]],
	['trust-and-guardrails', 'Trust and guardrails', 'harnesses', [17]],
	['encoders', 'Reading both ways', 'others', [5, 9]],
	['mixture-of-experts', 'Many experts', 'others', [6, 10]],
	['recurrent-models', 'Remembering without attention', 'others', [7, 8]],
	['seeing-pictures', 'Seeing pictures', 'others', [5, 10]],
	['diffusion', 'Painting from noise', 'others', [7, 11]],
	['reasoning-models', 'Thinking before answering', 'others', [11, 13]],
	['prompts-as-documents', 'A prompt is the start of a document', 'prompting', [3, 8, 9]],
	['few-shot', 'Learning from examples in the prompt', 'prompting', [9, 26]],
	['instructions-and-roles', 'Instructions, roles, and the system prompt', 'prompting', [13, 15]],
	['steps-and-structure', 'Asking for steps and structure', 'prompting', [16, 25]],
	['where-prompts-break', 'Where prompts break', 'prompting', [14, 19, 27]],
	['recap', 'Recap: the whole picture', 'wrapup', []]
];

/** The full curriculum, in reading order. Chapter files are `NN-slug.svx` in this folder. */
export const CURRICULUM: readonly ChapterMeta[] = rows.map(
	([slug, title, part, buildsOn], number) => ({
		number,
		slug,
		title,
		part: PARTS[part],
		buildsOn
	})
);

export function chapterFileName(chapter: ChapterMeta): string {
	return `${String(chapter.number).padStart(2, '0')}-${chapter.slug}.svx`;
}

/** "Part VII: Other kinds of models", or just the title for the unnumbered wrap-up. */
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
