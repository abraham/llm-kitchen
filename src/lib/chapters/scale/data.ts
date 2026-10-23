import { label } from '#lib/curriculum/index.ts';
import { RHYMES } from '#lib/data/rhymes.ts';
import { bigramCounts, bigramPairs } from '#lib/math/bigram.ts';
import { CharModel, charExamples } from '#lib/math/mlp.ts';

/** One model in the `scale` size comparison. Missing numbers were not published. */
export interface ScaleEntry {
	name: string;
	/** Publication year, for real models. */
	year?: number;
	/** Numbers learned from data (weights, or counts for the `predicting-by-counting` table). */
	parameters: number;
	/** Tokens (or characters, or word pairs) processed during training. */
	trainingTokens?: number;
	/** Training compute in floating-point operations. */
	flops?: number;
	/** Reference id for the published numbers, if any. */
	cite?: string;
	note?: string;
}

const texts = RHYMES.map((r) => r.text);
const pairs = Object.values(bigramCounts(texts)).reduce(
	(a, next) => a + Object.keys(next).length,
	0
);

// The `learning-from-mistakes` model exactly as the trainer worker builds it, trained for 6,000 steps of 32 examples.
const lower = texts.map((t) => t.toLowerCase());
const vocab = ['\u0000', ...[...new Set(lower.join(''))].sort()];
const tiny = new CharModel({ vocab, context: 3, embedding: 8, hidden: 64 }, 1).parameterCount;
export const TINY_TRAINING_EXAMPLES = 6000 * 32;
export const TINY_DATASET = charExamples(lower, vocab, 3).length;

export const SCALE: ScaleEntry[] = [
	{
		name: `${label('predicting-by-counting')} counting model`,
		parameters: pairs,
		trainingTokens: bigramPairs(texts).length,
		note: 'Counts of word pairs in six nursery rhymes; no training compute, just counting.'
	},
	{
		name: `${label('learning-from-mistakes')} tiny model`,
		parameters: tiny,
		trainingTokens: TINY_TRAINING_EXAMPLES,
		// The usual estimate: about 6 operations per weight per training token.
		flops: 6 * tiny * TINY_TRAINING_EXAMPLES,
		note: 'Characters predicted during 6,000 training steps; compute estimated as 6 × weights × tokens.'
	},
	{ name: 'GPT-2 small', year: 2019, parameters: 124_439_808, cite: 'radford2019' },
	{ name: 'GPT-2 (largest)', year: 2019, parameters: 1.5e9, cite: 'radford2019' },
	{
		name: 'GPT-3',
		year: 2020,
		parameters: 175e9,
		trainingTokens: 300e9,
		flops: 3.14e23,
		cite: 'brown2020'
	},
	{
		name: 'Gopher',
		year: 2021,
		parameters: 280e9,
		trainingTokens: 300e9,
		flops: 5.76e23,
		cite: 'hoffmann2022'
	},
	{
		name: 'Chinchilla',
		year: 2022,
		parameters: 70e9,
		trainingTokens: 1.4e12,
		flops: 5.76e23,
		cite: 'hoffmann2022'
	},
	{
		name: 'Llama 3 (largest)',
		year: 2024,
		parameters: 405e9,
		trainingTokens: 15.6e12,
		flops: 3.8e25,
		cite: 'grattafiori2024'
	}
];

/** Kaplan et al. (2020), eq. 1.1: test loss (nats per token) for N non-embedding parameters. */
export function kaplanLoss(nonEmbeddingParameters: number): number {
	return (8.8e13 / nonEmbeddingParameters) ** 0.076;
}

/** "175 billion", "3,790", "1.4 trillion". */
export function formatCount(n: number): string {
	const units: [number, string][] = [
		[1e12, 'trillion'],
		[1e9, 'billion'],
		[1e6, 'million']
	];
	for (const [size, word] of units) {
		if (n >= size) {
			const v = n / size;
			return `${v >= 100 ? Math.round(v) : Number(v.toPrecision(3))} ${word}`;
		}
	}
	return Math.round(n).toLocaleString('en-US');
}

/** 3.14e23 -> "3.1 × 10²³". */
export function formatPower(n: number): string {
	const exp = Math.floor(Math.log10(n));
	const sup = String(exp).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
	return `${(n / 10 ** exp).toFixed(1)} × 10${sup}`;
}
