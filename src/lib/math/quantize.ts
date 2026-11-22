import type { Candidate, Token } from '#lib/models/provider.ts';

/** The `quantize/precisions` dataset, written by scripts/record/quantize.py. */
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

export type BitFieldKind = 'sign' | 'exponent' | 'fraction' | 'int' | 'scale' | 'dropped';

/** One clickable segment of a weight's bit representation at a given precision. */
export interface BitField {
	id: string;
	label: string;
	bits: string;
	count: number;
	kind: BitFieldKind;
	dropped: boolean;
	summary: string;
}

/** Format a weight with a real minus sign, avoiding −0.00000. */
export function formatWeight(v: number, digits = 5): string {
	const fixed = Math.abs(v).toFixed(digits);
	if (Number(fixed) === 0) return fixed;
	return (v < 0 ? '−' : '') + fixed;
}

/** Exact IEEE 754 binary32 bit fields (1 sign + 8 exponent + 23 fraction). */
export function float32Parts(v: number): {
	sign: string;
	exponent: string;
	fraction: string;
	bits: string;
} {
	const buf = new ArrayBuffer(4);
	const view = new DataView(buf);
	view.setFloat32(0, v, false);
	const bits = view.getUint32(0, false).toString(2).padStart(32, '0');
	return {
		sign: bits.slice(0, 1),
		exponent: bits.slice(1, 9),
		fraction: bits.slice(9),
		bits
	};
}

/** IEEE 754 binary16 bit fields (1 sign + 5 exponent + 10 fraction), rounded to nearest even. */
export function float16Parts(v: number): {
	sign: string;
	exponent: string;
	fraction: string;
	bits: string;
} {
	const f32 = float32Parts(v);
	const signBit = f32.sign === '1' ? 1 : 0;
	const exp32 = parseInt(f32.exponent, 2);
	const frac32 = parseInt(f32.fraction, 2);

	let exp16 = 0;
	let frac16 = 0;
	if (exp32 === 255) {
		exp16 = 31;
		frac16 = frac32 ? 0x200 : 0;
	} else if (exp32 > 0) {
		const unbiased = exp32 - 127;
		const biased16 = unbiased + 15;
		if (biased16 >= 31) {
			exp16 = 31;
			frac16 = 0;
		} else if (biased16 <= 0) {
			const shift = 14 - biased16;
			if (shift <= 24) {
				const sig = (1 << 23) | frac32;
				const half = 1 << (shift - 1);
				const rem = sig & ((1 << shift) - 1);
				frac16 = sig >> shift;
				if (rem > half || (rem === half && (frac16 & 1) === 1)) frac16++;
				if (frac16 === 1024) {
					exp16 = 1;
					frac16 = 0;
				}
			}
		} else {
			exp16 = biased16;
			const rem = frac32 & 0x1fff;
			frac16 = frac32 >> 13;
			if (rem > 0x1000 || (rem === 0x1000 && (frac16 & 1) === 1)) {
				frac16++;
				if (frac16 === 1024) {
					frac16 = 0;
					exp16++;
				}
			}
		}
	}

	const sign = String(signBit);
	const exponent = exp16.toString(2).padStart(5, '0');
	const fraction = frac16.toString(2).padStart(10, '0');
	return { sign, exponent, fraction, bits: sign + exponent + fraction };
}

/** Signed two's-complement integer code for a block-quantized weight. */
export function quantizedIntCode(
	original: number,
	bits: number,
	max: number
): { q: number; scale: number; bitString: string } {
	const top = 2 ** (bits - 1) - 1;
	const scale = max / top;
	const q = Math.max(-top - 1, Math.min(top, Math.round(original / scale)));
	const mask = (1 << bits) - 1;
	const bitString = ((q & mask) >>> 0).toString(2).padStart(bits, '0');
	return { q, scale, bitString };
}

/** Build the annotated bit-field strip for one weight at the selected precision. */
export function annotateWeightBits(
	original: number,
	rounded: number,
	precision: Pick<Precision, 'bits' | 'kind' | 'label'>,
	max: number,
	block: number,
	scaleBits: number
): BitField[] {
	const f32 = float32Parts(original);
	const err = formatWeight(Math.abs(original - rounded));
	const origLabel = formatWeight(original);
	const roundLabel = formatWeight(rounded);

	if (precision.kind === 'float' && precision.bits === 32) {
		const expVal = parseInt(f32.exponent, 2) - 127;
		return [
			{
				id: 'sign',
				label: 'Sign',
				bits: f32.sign,
				count: 1,
				kind: 'sign',
				dropped: false,
				summary: `Sign bit (${f32.sign}): ${f32.sign === '1' ? 'negative' : 'positive'} weight (${origLabel}).`
			},
			{
				id: 'exponent',
				label: 'Exponent',
				bits: f32.exponent,
				count: 8,
				kind: 'exponent',
				dropped: false,
				summary: `8 exponent bits (${f32.exponent}): sets the scale to 2^${expVal}, letting 32-bit floats span tiny and huge numbers.`
			},
			{
				id: 'fraction',
				label: 'Fraction',
				bits: f32.fraction,
				count: 23,
				kind: 'fraction',
				dropped: false,
				summary: `23 fraction bits (${f32.fraction}): holds about 7 significant decimal digits; no bits dropped yet.`
			}
		];
	}

	if (precision.kind === 'float' && precision.bits === 16) {
		const f16 = float16Parts(original);
		const expVal = parseInt(f16.exponent, 2) - 15;
		const droppedFrac = f32.fraction.slice(10);
		return [
			{
				id: 'sign',
				label: 'Sign',
				bits: f16.sign,
				count: 1,
				kind: 'sign',
				dropped: false,
				summary: `Sign bit (${f16.sign}): unchanged (${f16.sign === '1' ? 'negative' : 'positive'}).`
			},
			{
				id: 'exponent',
				label: 'Exponent',
				bits: f16.exponent,
				count: 5,
				kind: 'exponent',
				dropped: false,
				summary: `5 exponent bits (${f16.exponent}): sets the scale to 2^${expVal} (3 fewer exponent bits than 32-bit float).`
			},
			{
				id: 'exp-dropped',
				label: 'Dropped exp',
				bits: '···',
				count: 3,
				kind: 'dropped',
				dropped: true,
				summary: `3 exponent bits dropped: narrows the range of powers of two compared to 32-bit float.`
			},
			{
				id: 'fraction',
				label: 'Fraction',
				bits: f16.fraction,
				count: 10,
				kind: 'fraction',
				dropped: false,
				summary: `10 fraction bits (${f16.fraction}): keeps about 3 significant digits (${roundLabel}, error ${err}).`
			},
			{
				id: 'frac-dropped',
				label: 'Dropped frac',
				bits: droppedFrac,
				count: 13,
				kind: 'dropped',
				dropped: true,
				summary: `13 trailing fraction bits (${droppedFrac}) discarded: moves ${origLabel} to ${roundLabel} (error ${err}).`
			}
		];
	}

	const { q, scale, bitString } = quantizedIntCode(original, precision.bits, max);
	const saved = 32 - precision.bits;
	const scalePerWeight = scaleBits / block;
	const qSign = bitString.slice(0, 1);
	const qMag = bitString.slice(1);
	const zeroed = Math.abs(rounded) < 1e-9 && Math.abs(original) >= 1e-9;

	return [
		{
			id: 'int-sign',
			label: 'Sign',
			bits: qSign,
			count: 1,
			kind: 'sign',
			dropped: false,
			summary: `Sign bit (${qSign}) of the ${precision.bits}-bit signed integer q = ${q < 0 ? `−${Math.abs(q)}` : q}.`
		},
		{
			id: 'int-val',
			label: `Code (${precision.bits - 1} b)`,
			bits: qMag,
			count: precision.bits - 1,
			kind: 'int',
			dropped: false,
			summary: `Stored integer q = ${q < 0 ? `−${Math.abs(q)}` : q} (binary ${bitString}): times the block scale ${formatWeight(scale)} gives ${roundLabel}${zeroed ? ' — rounded all the way to 0' : ''} (error ${err}).`
		},
		{
			id: 'scale',
			label: `+${scalePerWeight} b scale`,
			bits: `${scaleBits}b ÷ ${block}`,
			count: 0,
			kind: 'scale',
			dropped: false,
			summary: `Shared ${scaleBits}-bit scale (${formatWeight(scale)}) split across all ${block} weights in the block: ${scalePerWeight} extra bits per weight.`
		},
		{
			id: 'saved',
			label: 'Dropped',
			bits: `${saved} bits`,
			count: saved,
			kind: 'dropped',
			dropped: true,
			summary: `${saved} bits dropped per weight compared to 32-bit float (replaced by ${precision.bits}-bit integer ${bitString} plus the shared scale), leaving an error of ${err}.`
		}
	];
}
