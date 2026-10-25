/// <reference lib="webworker" />
// Loads and runs the browser tokenizers off the main thread: their vocabularies take long to parse.
import type { Token } from '#lib/models/provider.ts';
import {
	runTokenizer,
	type TokenizerInput,
	type TokenizerName
} from '#lib/models/tokenizer-encodings.ts';

export type TokenizerRequest = { id: number; name: TokenizerName; input: TokenizerInput };
export type TokenizerResponse =
	{ id: number; type: 'tokens'; tokens: Token[] } | { id: number; type: 'error'; message: string };

function post(message: TokenizerResponse) {
	self.postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<TokenizerRequest>) => {
	try {
		post({ id: data.id, type: 'tokens', tokens: await runTokenizer(data.name, data.input) });
	} catch (error) {
		post({
			id: data.id,
			type: 'error',
			message: error instanceof Error ? error.message : String(error)
		});
	}
};
