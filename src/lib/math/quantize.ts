import type { Candidate, Token } from '#lib/models/provider.ts';

/** static/quantize/gpt2.json, written by scripts/build-quantize.py. */
export interface QuantizeRun {
	version: 1;
	model: { id: string; displayName: string; revision: string | null };
	prompt: string;
	passage: string;
	parameters: number;
	/** Numbers per block that share one scale. */
	block: number;
	scaleBits: number;
	/** The block shown in the widget, and its largest size. */
	sample: { layer: string; max: number };
	precisions: Precision[];
	generatedAt: string;
}

export interface Precision {
	label: string;
	bits: number;
	kind: 'float' | 'int';
	/** Size of all the weights at this precision, including each block's scale. */
	bytes: number;
	candidates: Candidate[];
	generated: Token[];
	/** Average loss on the test passage. */
	loss: number;
	/** The sample block after rounding. */
	row: number[];
}

/** The rule of thumb: parameters × bits ÷ 8 bytes (ignores scales and runtime overhead). */
export function weightBytes(parameters: number, bits: number): number {
	return (parameters * bits) / 8;
}

/** Every value a block of `bits`-bit integers can take, when its largest size is `max`. */
export function levels(bits: number, max: number): number[] {
	const top = 2 ** (bits - 1) - 1;
	const scale = max / top;
	return Array.from({ length: 2 ** bits }, (_, i) => (i - top - 1) * scale);
}
