export interface Part {
	number: string;
	title: string;
}

export interface ChapterMeta {
	number: number;
	slug: string;
	title: string;
	part: Part;
}

export const PARTS = {
	prediction: { number: 'I', title: 'Prediction' },
	representation: { number: 'II', title: 'Representation' },
	learning: { number: 'III', title: 'Learning' },
	context: { number: 'IV', title: 'Context' },
	together: { number: 'V', title: 'Putting it together' },
	harnesses: { number: 'VI', title: 'Harnesses' }
} as const satisfies Record<string, Part>;

const p = PARTS;

/** The full curriculum, in reading order. Chapter files are `NN-slug.svx` in this folder. */
export const CURRICULUM: readonly ChapterMeta[] = [
	{ number: 0, slug: 'guessing-game', title: 'The guessing game', part: p.prediction },
	{ number: 1, slug: 'text-is-numbers', title: 'Text is just numbers', part: p.prediction },
	{
		number: 2,
		slug: 'predicting-by-counting',
		title: 'Predicting by counting',
		part: p.prediction
	},
	{
		number: 3,
		slug: 'probability-and-sampling',
		title: 'Probability and sampling',
		part: p.prediction
	},
	{ number: 4, slug: 'tokens', title: "Tokens: the model's alphabet", part: p.representation },
	{ number: 5, slug: 'embeddings', title: 'Meaning as position', part: p.representation },
	{ number: 6, slug: 'a-neuron', title: 'A neuron', part: p.learning },
	{ number: 7, slug: 'learning-from-mistakes', title: 'Learning from mistakes', part: p.learning },
	{ number: 8, slug: 'the-context-problem', title: 'The context problem', part: p.context },
	{ number: 9, slug: 'attention', title: 'Attention', part: p.context },
	{ number: 10, slug: 'the-transformer-block', title: 'The transformer block', part: p.context },
	{ number: 11, slug: 'generating-text', title: 'Generating text', part: p.together },
	{ number: 12, slug: 'scale', title: 'Scale', part: p.together },
	{
		number: 13,
		slug: 'predictor-to-assistant',
		title: 'From predictor to assistant',
		part: p.together
	},
	{ number: 14, slug: 'quirks-and-limits', title: 'Quirks and limits', part: p.together },
	{
		number: 15,
		slug: 'the-model-is-not-the-product',
		title: 'The model is not the product',
		part: p.harnesses
	},
	{ number: 16, slug: 'tools', title: 'Tools', part: p.harnesses },
	{ number: 17, slug: 'the-agent-loop', title: 'The agent loop', part: p.harnesses },
	{ number: 18, slug: 'managing-the-context', title: 'Managing the context', part: p.harnesses },
	{ number: 19, slug: 'trust-and-guardrails', title: 'Trust and guardrails', part: p.harnesses },
	{ number: 20, slug: 'recap', title: 'Recap: the whole picture', part: p.harnesses }
];

export function chapterFileName(chapter: ChapterMeta): string {
	return `${String(chapter.number).padStart(2, '0')}-${chapter.slug}.svx`;
}

export function findChapter(slug: string): ChapterMeta | undefined {
	return CURRICULUM.find((chapter) => chapter.slug === slug);
}
