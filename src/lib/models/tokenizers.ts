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

const loaded = new Map<TokenizerName, Promise<Encoding>>();

function encoding(name: TokenizerName): Promise<Encoding> {
	let pending = loaded.get(name);
	if (!pending) {
		pending = TOKENIZERS[name].load();
		loaded.set(name, pending);
	}
	return pending;
}

export async function tokenize(name: TokenizerName, text: string): Promise<Token[]> {
	const enc = await encoding(name);
	return enc.encode(text).map((id) => ({ id, text: enc.decode([id]) }));
}

/** The text of each token id on its own. */
export async function tokensFor(name: TokenizerName, ids: number[]): Promise<Token[]> {
	const enc = await encoding(name);
	return ids.map((id) => ({ id, text: enc.decode([id]) }));
}
