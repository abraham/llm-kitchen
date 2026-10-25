import type { ChatTurn, ToolSchema } from '#lib/harness/agent.ts';
import type { DownloadableModel } from './downloads.ts';
import { send, webgpuAvailable } from './inference-client.ts';
import { isDownloaded, openModelCache, removeModel } from './model-cache.ts';

export { CANONICAL_LIVE, MINILM } from './downloads.ts';

/** What a chat model writes from: a chat in its template, or plain text it continues. */
export type GenerateInput = { messages: ChatTurn[]; tools?: ToolSchema[] } | { text: string };

export interface Generated {
	/** The exact text the model read. */
	prompt: string;
	text: string;
	tokens: number;
	/** It ended the reply itself, rather than at the token limit. */
	stopped: boolean;
}

/** A model that runs in the visitor's browser (tier T2), only after they ask for it. */
export type BrowserModelSpec = DownloadableModel;

export type ModelStatus =
	| { state: 'checking' }
	| { state: 'missing' }
	| { state: 'downloading'; fraction: number }
	| { state: 'downloaded' }
	| { state: 'loading' }
	| { state: 'ready'; device: 'webgpu' | 'wasm' }
	| { state: 'error'; message: string };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One in-browser model: whether it's downloaded, and downloading and running it. */
export class BrowserModel {
	status = $state<ModelStatus>({ state: 'checking' });
	/** Whether every listed file is in this browser's cache; `null` until checked. */
	cached = $state<boolean | null>(null);
	/** False where the browser has no Cache API, so each visit downloads again. */
	keepsDownloads = $state(true);
	readonly spec: BrowserModelSpec;
	#download: Promise<boolean> | null = null;

	constructor(spec: BrowserModelSpec) {
		this.spec = spec;
	}

	/** Reads the cache; only a model that isn't downloading, starting, running, or failed changes state. */
	async check(): Promise<void> {
		const cache = await openModelCache();
		this.keepsDownloads = cache !== null;
		this.cached = cache ? await isDownloaded(cache, this.spec) : false;
		if (['checking', 'missing', 'downloaded'].includes(this.status.state)) {
			this.status = { state: this.cached ? 'downloaded' : 'missing' };
		}
	}

	/** Downloads the files into the cache without starting the model; resolves to whether it worked. */
	download(): Promise<boolean> {
		return (this.#download ??= this.#fetch().finally(() => (this.#download = null)));
	}

	async #fetch(): Promise<boolean> {
		const loaded: Record<string, number> = {};
		this.status = { state: 'downloading', fraction: 0 };
		try {
			await send({ type: 'download', model: this.spec.onnxId }, (p) => {
				if (!('file' in p)) return;
				loaded[p.file] = p.loaded;
				this.status = { state: 'downloading', fraction: this.#fraction(loaded) };
			});
			this.cached = true;
			this.status = { state: 'downloaded' };
			return true;
		} catch (error) {
			this.status = { state: 'error', message: message(error) };
			return false;
		}
	}

	/** Downloads what's missing, then starts the model in the inference worker. */
	async load(): Promise<void> {
		const { state } = this.status;
		if (state === 'ready' || state === 'loading' || state === 'checking') return;
		if (this.keepsDownloads && state !== 'downloaded' && !(await this.download())) return;
		// Without a cache, Transformers.js downloads the files as it starts the model.
		const fetching = !this.keepsDownloads;
		const loaded: Record<string, number> = {};
		this.status = fetching ? { state: 'downloading', fraction: 0 } : { state: 'loading' };
		try {
			const device = (await webgpuAvailable()) ? 'webgpu' : 'wasm';
			await send(
				{
					type: 'load',
					task: this.spec.task,
					model: this.spec.onnxId,
					revision: this.spec.onnxRevision,
					device,
					dtype: this.spec.dtype ?? 'q8',
					file: this.spec.file
				},
				(p) => {
					if (!fetching || !('file' in p)) return;
					loaded[p.file] = p.loaded;
					this.status = { state: 'downloading', fraction: this.#fraction(loaded) };
				}
			);
			this.status = { state: 'ready', device };
		} catch (error) {
			this.status = { state: 'error', message: message(error) };
		}
	}

	/** Deletes the files from this browser; a running model keeps running until the tab reloads. */
	async remove(): Promise<void> {
		const cache = await openModelCache();
		if (!cache) return;
		await removeModel(cache, this.spec);
		this.cached = false;
		if (this.status.state === 'downloaded' || this.status.state === 'error') {
			this.status = { state: 'missing' };
		}
	}

	#fraction(loaded: Record<string, number>): number {
		const bytes = Object.values(loaded).reduce((a, b) => a + b, 0);
		return Math.min(1, bytes / (this.spec.modelMB * 1e6));
	}

	async embed(texts: string[]): Promise<number[][]> {
		const r = await send({ type: 'embed', model: this.spec.onnxId, texts });
		if (r.type !== 'embedded') throw new Error('Unexpected response from the model');
		return r.vectors;
	}

	/** CLIP's text half: each text as a unit-length vector in the space it shares with pictures. */
	async embedText(texts: string[]): Promise<number[][]> {
		const r = await send({ type: 'embed-text', model: this.spec.onnxId, texts });
		if (r.type !== 'embedded') throw new Error('Unexpected response from the model');
		return r.vectors;
	}

	/** The `topK` likeliest tokens for the one `[MASK]` in `text`. */
	async fillMask(
		text: string,
		topK: number
	): Promise<{ id: number; text: string; prob: number }[]> {
		const r = await send({ type: 'fill-mask', model: this.spec.onnxId, text, topK });
		if (r.type !== 'filled') throw new Error('Unexpected response from the model');
		return r.top;
	}

	/** Next-token probabilities after the token ids `ids`: the top `topK` and the rest. */
	async nextToken(
		ids: number[],
		topK: number
	): Promise<{ top: { id: number; prob: number }[]; rest: number }> {
		const r = await send({ type: 'next-token', model: this.spec.onnxId, ids, topK });
		if (r.type !== 'distribution') throw new Error('Unexpected response from the model');
		return { top: r.top, rest: r.rest };
	}

	/**
	 * A chat model's greedy reply to a chat (in its template, with any tools) or its continuation
	 * of plain text; `ontext` gets the reply so far as it's written.
	 */
	async generate(
		input: GenerateInput,
		maxTokens: number,
		ontext?: (soFar: string) => void
	): Promise<Generated> {
		let soFar = '';
		const r = await send(
			{ type: 'generate', model: this.spec.onnxId, maxTokens, ...input },
			(p) => {
				if (!('text' in p)) return;
				soFar += p.text;
				ontext?.(soFar);
			}
		);
		if (r.type !== 'generated') throw new Error('Unexpected response from the model');
		return { prompt: r.prompt, text: r.text, tokens: r.tokens, stopped: r.stopped };
	}

	/** The chance the model continues `prompt` with all of `answer` (text for a chat model, else ids). */
	async score(prompt: string | number[], answer: string | number[]): Promise<number> {
		const r = await send({ type: 'score', model: this.spec.onnxId, prompt, answer });
		if (r.type !== 'scored') throw new Error('Unexpected response from the model');
		return r.p;
	}
}

const models: Record<string, BrowserModel> = {};

/**
 * The tab's one instance of a model, shared by every widget and the Downloads page. In the browser
 * it reads the cache when created and again whenever the tab comes back into view, since another
 * tab may have downloaded or removed the model.
 */
export function browserModel(spec: BrowserModelSpec): BrowserModel {
	let model = models[spec.onnxId];
	if (!model) {
		model = models[spec.onnxId] = new BrowserModel(spec);
		if (typeof document !== 'undefined') {
			const created = model;
			void created.check();
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') void created.check();
			});
		}
	}
	return model;
}
