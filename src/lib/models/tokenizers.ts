import type { TokenizerRequest, TokenizerResponse } from '#lib/workers/tokenizer.worker.ts';
import type { Token } from './provider.ts';
import { runTokenizer, type TokenizerInput, type TokenizerName } from './tokenizer-encodings.ts';

export { TOKENIZERS, type TokenizerName } from './tokenizer-encodings.ts';

type Pending = { resolve: (tokens: Token[]) => void; reject: (e: Error) => void };

let worker: Promise<Worker> | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

/** The shared tokenizer worker, created on first use. */
function tokenizerWorker(): Promise<Worker> {
	worker ??= import('#lib/workers/tokenizer.worker.ts?worker').then(
		({ default: TokenizerWorker }) => {
			const w = new TokenizerWorker();
			w.onmessage = ({ data }: MessageEvent<TokenizerResponse>) => {
				const p = pending.get(data.id);
				if (!p) return;
				pending.delete(data.id);
				if ('error' in data) p.reject(new Error(data.error));
				else p.resolve(data.tokens);
			};
			w.onerror = (event) => {
				for (const p of pending.values()) p.reject(new Error(event.message));
				pending.clear();
			};
			return w;
		}
	);
	return worker;
}

// Parsing a vocabulary blocks for a long time, so pages run tokenizers in a worker. Node (unit
// tests) has no workers and runs them in place.
async function run(name: TokenizerName, input: TokenizerInput): Promise<Token[]> {
	if (typeof Worker === 'undefined') return runTokenizer(name, input);
	const w = await tokenizerWorker();
	const id = nextId++;
	return new Promise((resolve, reject) => {
		pending.set(id, { resolve, reject });
		w.postMessage({ id, name, input } satisfies TokenizerRequest);
	});
}

export function tokenize(name: TokenizerName, text: string): Promise<Token[]> {
	return run(name, { text });
}

/** The text of each token id on its own. */
export function tokensFor(name: TokenizerName, ids: number[]): Promise<Token[]> {
	return run(name, { ids });
}
