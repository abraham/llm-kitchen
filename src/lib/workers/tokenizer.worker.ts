/// <reference lib="webworker" />
// Loads and runs the browser tokenizers off the main thread: their vocabularies take long to parse.
import type { Token } from '#lib/models/provider.ts';
import {
	runTokenizer,
	type TokenizerInput,
	type TokenizerName
} from '#lib/models/tokenizer-encodings.ts';

export type TokenizerRequest = { id: number; name: TokenizerName; input: TokenizerInput };
export type TokenizerResponse = { id: number; tokens: Token[] } | { id: number; error: string };

self.onmessage = async ({ data }: MessageEvent<TokenizerRequest>) => {
	try {
		const tokens = await runTokenizer(data.name, data.input);
		self.postMessage({ id: data.id, tokens } satisfies TokenizerResponse);
	} catch (e) {
		self.postMessage({ id: data.id, error: String(e) } satisfies TokenizerResponse);
	}
};
