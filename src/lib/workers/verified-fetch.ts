import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface PinnedModel {
	onnxId: string;
	onnxRevision: string;
	/** Path in the repository → SHA-256 (hex) of each file Transformers.js downloads. */
	onnxFiles: Record<string, string>;
}

const HUB = 'https://huggingface.co';

/**
 * Wraps `fetch` for Transformers.js (`env.fetch`) so that every full download from Hugging Face is a
 * pinned model's listed file and matches its SHA-256. The hash is computed as the file streams, so
 * progress still works; a mismatch errors the body at its end, before Transformers.js can use or
 * cache it. One-byte range probes and misses carry no model data and pass through.
 *
 * A pinned model asked for at another revision is fetched at its pinned commit instead:
 * Transformers.js's `pipeline()` reads `config.json` from `main` to pick its files, ignoring the
 * `revision` option.
 */
export function verifiedFetch(
	models: readonly PinnedModel[],
	base: typeof fetch = fetch
): typeof fetch {
	const revisions = new Map(models.map((m) => [m.onnxId, m.onnxRevision]));
	const hashes = new Map<string, string>();
	for (const m of models) {
		for (const [file, hash] of Object.entries(m.onnxFiles)) {
			hashes.set(`/${m.onnxId}/resolve/${m.onnxRevision}/${file}`, hash);
		}
	}

	return async (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		if (url.origin !== HUB) return base(input, init);
		const [, owner, name, resolve, revision] = url.pathname.split('/');
		const pinned = revisions.get(`${owner}/${name}`);
		if (resolve === 'resolve' && pinned && revision !== pinned) {
			url.pathname = url.pathname.replace(`/resolve/${revision}/`, `/resolve/${pinned}/`);
		}
		const response = await base(url.href, init);
		if (new Headers(init?.headers).has('Range') || response.status !== 200 || !response.body) {
			return response;
		}
		const path = decodeURIComponent(url.pathname);
		const want = hashes.get(path);
		if (!want) {
			await response.body.cancel();
			throw new Error(`${path} isn't a file of a pinned model`);
		}
		const hash = sha256.create();
		const body = response.body.pipeThrough(
			new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					hash.update(chunk);
					controller.enqueue(chunk);
				},
				flush() {
					if (bytesToHex(hash.digest()) !== want) {
						const error = new Error(`${path} doesn't match its recorded SHA-256`);
						// Browsers report an errored body to its reader as "Failed to fetch".
						console.error(error.message);
						throw error;
					}
				}
			})
		);
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});
	};
}
