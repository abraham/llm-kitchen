import type { Token } from './provider.ts';

interface Encoding {
	encode(text: string): number[];
	decode(ids: number[]): string;
}

/** Browser tokenizers (tier T1). Each is a separate chunk, loaded only when first used. */
export const TOKENIZERS = {
	gpt2: {
		label: 'GPT-2',
		encoding: 'gpt2',
		load: () => import('gpt-tokenizer/encoding/gpt2') as Promise<Encoding>
	},
	cl100k: {
		label: 'GPT-4',
		encoding: 'cl100k_base',
		load: () => import('gpt-tokenizer/encoding/cl100k_base') as Promise<Encoding>
	},
	o200k: {
		label: 'GPT-4o',
		encoding: 'o200k_base',
		load: () => import('gpt-tokenizer/encoding/o200k_base') as Promise<Encoding>
	}
} as const;

export type TokenizerName = keyof typeof TOKENIZERS;

/** Text to encode, or token ids to turn back into text one at a time. */
export type TokenizerInput = { text: string } | { ids: number[] };

const loaded = new Map<TokenizerName, Promise<Encoding>>();

function encoding(name: TokenizerName): Promise<Encoding> {
	let pending = loaded.get(name);
	if (!pending) {
		pending = TOKENIZERS[name].load();
		loaded.set(name, pending);
	}
	return pending;
}

export async function runTokenizer(name: TokenizerName, input: TokenizerInput): Promise<Token[]> {
	const enc = await encoding(name);
	const ids = 'text' in input ? enc.encode(input.text) : input.ids;
	return ids.map((id) => ({ id, text: enc.decode([id]) }));
}
