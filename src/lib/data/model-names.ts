/** Model names on Hugging Face, as listed on 2026-10-23, and what each part of a name means. */

export type PartKind =
	'family' | 'size' | 'effective' | 'active' | 'tuning' | 'drafter' | 'quantization' | 'format';

export interface NamePart {
	text: string;
	kind: PartKind;
	meaning: string;
	/** Chapters that explain this part. */
	chapters: number[];
}

export const COLLECTIONS: { name: string; ids: string[] }[] = [
	{
		name: 'Gemma 4',
		ids: [
			'google/gemma-4-E2B',
			'google/gemma-4-E2B-it',
			'google/gemma-4-E4B-it',
			'google/gemma-4-12B-it',
			'google/gemma-4-26B-A4B',
			'google/gemma-4-26B-A4B-it',
			'google/gemma-4-31B-it',
			'google/gemma-4-31B-it-assistant',
			'google/diffusiongemma-26B-A4B-it'
		]
	},
	{
		name: 'Gemma 4 QAT',
		ids: [
			'google/gemma-4-E2B-it-qat-mobile-transformers',
			'google/gemma-4-E4B-it-qat-mobile-ct',
			'google/gemma-4-12B-it-qat-q4_0-gguf',
			'google/gemma-4-31B-it-qat-q4_0-unquantized',
			'google/gemma-4-31B-it-qat-w4a16-ct'
		]
	},
	{
		name: 'Used on this site',
		ids: [
			'openai-community/gpt2',
			'openai-community/gpt2-medium',
			'Qwen/Qwen2.5-0.5B',
			'Qwen/Qwen2.5-1.5B-Instruct'
		]
	}
];

/** Gemma 4 E models store per-layer embedding tables on top of their effective size. */
const STORED_E: Record<string, string> = { '2': '5.1', '4': '8' };

const WORDS: Record<string, Omit<NamePart, 'text'>> = {
	it: {
		kind: 'tuning',
		meaning:
			'Instruction-tuned: trained further to follow instructions and chat. Without it, the name is a base model that only continues text.',
		chapters: [15]
	},
	instruct: {
		kind: 'tuning',
		meaning:
			'Instruction-tuned: trained further to follow instructions and chat. Without it, the name is a base model that only continues text.',
		chapters: [15]
	},
	assistant: {
		kind: 'drafter',
		meaning:
			'A small drafter for this model: it guesses several tokens ahead and the big model checks them in one pass, for the same text, faster.',
		chapters: [14]
	},
	qat: {
		kind: 'quantization',
		meaning:
			'Quantization-aware training: trained with the rounding in place, so it keeps its quality at 4 bits per weight.',
		chapters: [13]
	},
	q4_0: {
		kind: 'quantization',
		meaning:
			'Q4_0: 4-bit whole numbers in blocks of 32 weights that share one scale, the format from GGUF files.',
		chapters: [13]
	},
	unquantized: {
		kind: 'quantization',
		meaning:
			'The QAT weights before rounding, stored at 16 bits, for people who round them with their own tools.',
		chapters: [13]
	},
	w4a16: {
		kind: 'quantization',
		meaning:
			'4-bit weights (w4) and 16-bit activations (a16), the vectors passed from block to block while it runs.',
		chapters: [10, 13]
	},
	mobile: {
		kind: 'quantization',
		meaning: 'Rounded for phones, with a custom mix of bit widths that includes some 2-bit layers.',
		chapters: [13]
	},
	transformers: {
		kind: 'format',
		meaning: 'Packaged for Hugging Face Transformers, a Python library for running models.',
		chapters: []
	},
	ct: {
		kind: 'format',
		meaning: 'Packaged as compressed tensors, the format the vLLM serving software reads.',
		chapters: []
	},
	gguf: {
		kind: 'format',
		meaning:
			'A GGUF file, with the rounding already applied, for llama.cpp and the apps built on it.',
		chapters: [13]
	},
	medium: {
		kind: 'size',
		meaning:
			'The 355-million-weight size. GPT-2 named its sizes with words: small (the default), medium, large, and XL.',
		chapters: [12]
	}
};

function family(name: string): [NamePart, string] {
	let m = name.match(/^gemma-(\d+)(?:-|$)/);
	if (m)
		return [
			{
				text: `gemma-${m[1]}`,
				kind: 'family',
				meaning: `Gemma, Google's family of open models, generation ${m[1]}. Compare sizes within one generation.`,
				chapters: []
			},
			name.slice(m[0].length)
		];
	m = name.match(/^diffusiongemma(?:-|$)/);
	if (m)
		return [
			{
				text: 'diffusiongemma',
				kind: 'family',
				meaning:
					'A Gemma 4 model that writes by denoising a block of tokens at a time, not one token per pass.',
				chapters: [34]
			},
			name.slice(m[0].length)
		];
	m = name.match(/^Qwen(\d+(?:\.\d+)?)(?:-|$)/);
	if (m)
		return [
			{
				text: `Qwen${m[1]}`,
				kind: 'family',
				meaning: `Qwen, a family of open models from Alibaba, generation ${m[1]}.`,
				chapters: []
			},
			name.slice(m[0].length)
		];
	m = name.match(/^gpt2(?:-|$)/);
	if (m)
		return [
			{
				text: 'gpt2',
				kind: 'family',
				meaning:
					"GPT-2, OpenAI's 2019 model family. Plain gpt2 is the small size, 124 million weights.",
				chapters: [12]
			},
			name.slice(m[0].length)
		];
	throw new Error(`Unknown model family in ${name}`);
}

function part(text: string): NamePart {
	let m = text.match(/^(\d+(?:\.\d+)?)B$/);
	if (m)
		return {
			text,
			kind: 'size',
			meaning: `About ${m[1]} billion weights: at 16 bits each, about ${2 * Number(m[1])} GB.`,
			chapters: [12, 13]
		};
	m = text.match(/^E(\d+)B$/);
	if (m)
		return {
			text,
			kind: 'effective',
			meaning: `Effective size: about ${m[1]} billion weights do the work for each token. The file also holds per-layer tables that are only looked up, like the token table, so it stores ${STORED_E[m[1]]} billion numbers in all.`,
			chapters: [5]
		};
	m = text.match(/^A(\d+)B$/);
	if (m)
		return {
			text,
			kind: 'active',
			meaning: `Active size: a mixture of experts that runs only about ${m[1]} billion of its weights for each token. All of them still have to fit in memory.`,
			chapters: [31]
		};
	const word = WORDS[text.toLowerCase()];
	if (word) return { text, ...word };
	throw new Error(`Unknown name part ${text}`);
}

/** Split a model ID into its parts. `base` is true when nothing marks it as instruction-tuned. */
export function decodeName(id: string): { org: string; parts: NamePart[]; base: boolean } {
	const [org, name] = id.split('/');
	const [first, rest] = family(name);
	const parts = [first, ...(rest ? rest.split('-').map(part) : [])];
	return { org, parts, base: !parts.some((p) => p.kind === 'tuning') };
}

/** What the Gemma 4 model cards list that the names don't say, by size. */
export const NOT_IN_NAME: Record<string, { context: string; inputs: string }> = {
	E2B: { context: '128K tokens', inputs: 'text, images, and audio' },
	E4B: { context: '128K tokens', inputs: 'text, images, and audio' },
	'12B': { context: '256K tokens', inputs: 'text, images, and audio' },
	'26B': { context: '256K tokens', inputs: 'text and images' },
	'31B': { context: '256K tokens', inputs: 'text and images' }
};

/** Models for the memory calculator: numbers stored, and the ones used per token if fewer. */
export const MEMORY_MODELS: { name: string; stored: number; perToken?: number }[] = [
	{ name: 'GPT-2 small', stored: 124_439_808 },
	{ name: 'Gemma 4 E2B', stored: 5.1e9, perToken: 2.3e9 },
	{ name: 'Gemma 4 E4B', stored: 8e9, perToken: 4.5e9 },
	{ name: 'Gemma 4 12B', stored: 11.95e9 },
	{ name: 'Gemma 4 26B A4B', stored: 25.2e9, perToken: 3.8e9 },
	{ name: 'Gemma 4 31B', stored: 30.7e9 }
];

/** Example devices; real ones vary, and the system needs some of the memory too. */
export const DEVICES: { name: string; gb: number }[] = [
	{ name: 'A phone with 8 GB', gb: 8 },
	{ name: 'A laptop with 16 GB', gb: 16 },
	{ name: 'A 24 GB graphics card', gb: 24 }
];
