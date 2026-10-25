import type { TokenizerRequest, TokenizerResponse } from '#lib/workers/tokenizer.worker.ts';
import { rpc } from '#lib/workers/rpc.ts';
import type { Token } from './provider.ts';
import { runTokenizer, type TokenizerInput, type TokenizerName } from './tokenizer-encodings.ts';

export { TOKENIZERS, type TokenizerName } from './tokenizer-encodings.ts';

const request = rpc<TokenizerRequest, TokenizerResponse>(() =>
	import('#lib/workers/tokenizer.worker.ts?worker').then(
		({ default: TokenizerWorker }) => new TokenizerWorker()
	)
);

// Parsing a vocabulary blocks for a long time, so pages run tokenizers in a worker. Node (unit
// tests) has no workers and runs them in place.
async function run(name: TokenizerName, input: TokenizerInput): Promise<Token[]> {
	if (typeof Worker === 'undefined') return runTokenizer(name, input);
	return (await request({ name, input })).tokens;
}

export function tokenize(name: TokenizerName, text: string): Promise<Token[]> {
	return run(name, { text });
}

/** The text of each token id on its own. */
export function tokensFor(name: TokenizerName, ids: number[]): Promise<Token[]> {
	return run(name, { ids });
}
