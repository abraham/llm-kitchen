/// <reference lib="webworker" />
// Runs Transformers.js models off the main thread. Messages: see BrowserModel in
// src/lib/models/browser-model.svelte.ts.
import {
	AutoModelForCausalLM,
	AutoTokenizer,
	CLIPTextModelWithProjection,
	env,
	pipeline,
	Tensor,
	TextStreamer,
	type FeatureExtractionPipeline,
	type FillMaskPipeline,
	type Message,
	type PreTrainedModel,
	type PreTrainedTokenizer
} from '@huggingface/transformers';
// ONNX Runtime's WebAssembly files are bundled as hashed assets of this site (instead of the default
// CDN), so they get long-lived caching and the page CSP can stay 'self'.
import asyncifyMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import asyncifyWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import { DOWNLOADS, type DownloadableModel } from '#lib/models/downloads.ts';
import type { ChatTurn, ToolSchema } from '#lib/harness/agent.ts';
import {
	cacheKey,
	OLD_CACHE,
	openModelCache,
	pinnedUrl,
	removeUnlisted
} from '#lib/models/model-cache.ts';
import { verifiedFetch, type PinnedModel } from './verified-fetch.ts';

const fetchPinned = verifiedFetch(DOWNLOADS);
env.allowLocalModels = false;
env.fetch = fetchPinned;
const abs = (url: string) => new URL(url, self.location.href).href;
// One build for every supported browser; only Safari older than 26 (no WebGPU) needed another.
if (env.backends.onnx.wasm) {
	env.backends.onnx.wasm.wasmPaths = { mjs: abs(asyncifyMjs), wasm: abs(asyncifyWasm) };
}

let opened: Promise<Cache | null> | undefined;

/** The site's model store, cleared of older commits and of the old store on first use. */
function modelCache(): Promise<Cache | null> {
	return (opened ??= openModelCache().then(async (cache) => {
		if (cache) {
			await Promise.all([removeUnlisted(cache, DOWNLOADS), caches.delete(OLD_CACHE)]).catch(
				() => {}
			);
		}
		return cache;
	}));
}

// Transformers.js reads and writes the site's store, keyed by pinned URL, so the page can find a
// model's files from its config. It writes a file only after verifiedFetch has checked all of it.
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = {
	async match(request) {
		const key = cacheKey(request, DOWNLOADS);
		return key ? (await modelCache())?.match(key) : undefined;
	},
	async put(request, response) {
		const key = cacheKey(request, DOWNLOADS);
		const cache = key ? await modelCache() : null;
		if (key && cache) await cache.put(key, response).catch(() => {});
	}
};

export type WorkerRequest =
	| {
			id: number;
			type: 'load';
			task: DownloadableModel['task'];
			model: string;
			/** Hugging Face commit to download, so the files can't change under the site. */
			revision: string;
			device: 'webgpu' | 'wasm';
			/** The weights' precision, which picks the ONNX file's suffix. */
			dtype: NonNullable<DownloadableModel['dtype']>;
			/** ONNX file to load instead of the default, without the dtype suffix. */
			file?: string;
	  }
	| { id: number; type: 'download'; model: string }
	| { id: number; type: 'embed'; model: string; texts: string[] }
	| { id: number; type: 'embed-text'; model: string; texts: string[] }
	| { id: number; type: 'fill-mask'; model: string; text: string; topK: number }
	| { id: number; type: 'next-token'; model: string; ids: number[]; topK: number }
	| {
			id: number;
			type: 'generate';
			model: string;
			/** A chat, put in the model's chat template, or `text` to continue as it is. */
			messages?: ChatTurn[];
			text?: string;
			tools?: ToolSchema[];
			maxTokens: number;
	  }
	| {
			id: number;
			type: 'score';
			model: string;
			/** Text (for a model with its own tokenizer, the chat model) or token ids. */
			prompt: string | number[];
			answer: string | number[];
	  };

export type WorkerResponse =
	| { id: number; type: 'progress'; file: string; loaded: number; total: number }
	/** Text a `generate` request has written since its last message. */
	| { id: number; type: 'progress'; text: string }
	| { id: number; type: 'downloaded' }
	| { id: number; type: 'loaded'; device: 'webgpu' | 'wasm' }
	| { id: number; type: 'embedded'; vectors: number[][] }
	| { id: number; type: 'filled'; top: { id: number; text: string; prob: number }[] }
	| { id: number; type: 'distribution'; top: { id: number; prob: number }[]; rest: number }
	| {
			id: number;
			type: 'generated';
			/** The exact text the model read. */
			prompt: string;
			text: string;
			tokens: number;
			/** It ended its reply itself, rather than at `maxTokens`. */
			stopped: boolean;
	  }
	| { id: number; type: 'scored'; p: number }
	| { id: number; type: 'error'; message: string };

const extractors = new Map<string, Promise<FeatureExtractionPipeline>>();
const unmaskers = new Map<string, Promise<FillMaskPipeline>>();
const textEncoders = new Map<
	string,
	Promise<{ tokenizer: PreTrainedTokenizer; model: PreTrainedModel }>
>();
const causalModels = new Map<string, Promise<PreTrainedModel>>();
const chatModels = new Map<
	string,
	Promise<{ tokenizer: PreTrainedTokenizer; model: PreTrainedModel }>
>();

function post(message: WorkerResponse) {
	self.postMessage(message);
}

/** Load once per model id; forget failed loads so they can be retried. */
function once<T>(cache: Map<string, Promise<T>>, key: string, start: () => Promise<T>): Promise<T> {
	let pending = cache.get(key);
	if (!pending) {
		pending = start();
		cache.set(key, pending);
		pending.catch(() => cache.delete(key));
	}
	return pending;
}

/** Probabilities for the token after `ids`: the top `k`, plus the total of everything else. */
async function nextToken(model: PreTrainedModel, ids: number[], k: number) {
	const n = ids.length;
	const input_ids = new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, n]);
	const attention_mask = new Tensor('int64', new BigInt64Array(n).fill(1n), [1, n]);
	const { logits } = (await model({ input_ids, attention_mask })) as { logits: Tensor };
	const vocab = logits.dims[2];
	const last = (logits.data as Float32Array).subarray((n - 1) * vocab, n * vocab);
	let max = -Infinity;
	for (const l of last) if (l > max) max = l;
	const exps = new Float64Array(vocab);
	let sum = 0;
	for (let i = 0; i < vocab; i++) sum += exps[i] = Math.exp(last[i] - max);
	const order = Array.from({ length: vocab }, (_, i) => i)
		.sort((a, b) => exps[b] - exps[a])
		.slice(0, k);
	const top = order.map((id) => ({ id, prob: exps[id] / sum }));
	return { top, rest: Math.max(0, 1 - top.reduce((a, t) => a + t.prob, 0)) };
}

const ids = (tensor: Tensor) => Array.from(tensor.data as BigInt64Array, Number);

/** The chance the model continues `prompt` with every token of `answer`, in order. */
async function score(model: PreTrainedModel, prompt: number[], answer: number[]): Promise<number> {
	const all = [...prompt, ...answer];
	const n = all.length;
	const input_ids = new Tensor('int64', BigInt64Array.from(all, BigInt), [1, n]);
	const attention_mask = new Tensor('int64', new BigInt64Array(n).fill(1n), [1, n]);
	let { logits } = (await model({ input_ids, attention_mask })) as { logits: Tensor };
	if (logits.type !== 'float32') logits = logits.to('float32');
	const vocab = logits.dims[2];
	const data = logits.data as Float32Array;
	let logp = 0;
	answer.forEach((token, j) => {
		const row = data.subarray((prompt.length - 1 + j) * vocab, (prompt.length + j) * vocab);
		let max = -Infinity;
		for (const l of row) if (l > max) max = l;
		let sum = 0;
		for (const l of row) sum += Math.exp(l - max);
		logp += row[token] - max - Math.log(sum);
	});
	return Math.exp(logp);
}

/** Greedy generation, so a rerun writes the same reply; streams the text as it's written. */
async function generate(
	{ tokenizer, model }: { tokenizer: PreTrainedTokenizer; model: PreTrainedModel },
	request: Extract<WorkerRequest, { type: 'generate' }>
) {
	const prompt = request.messages
		? (tokenizer.apply_chat_template(request.messages as Message[], {
				tools: request.tools,
				add_generation_prompt: true,
				tokenize: false
			}) as string)
		: (request.text ?? '');
	const inputs = tokenizer(prompt, { add_special_tokens: false });
	const start = inputs.input_ids.dims[1];
	const streamer = new TextStreamer(tokenizer, {
		skip_prompt: true,
		skip_special_tokens: true,
		callback_function: (text: string) => post({ id: request.id, type: 'progress', text })
	});
	const output = (await model.generate({
		...inputs,
		max_new_tokens: request.maxTokens,
		do_sample: false,
		streamer
	})) as Tensor;
	const written = ids(output).slice(start);
	const eos = [model.generation_config?.eos_token_id ?? []].flat() as number[];
	const stopped = eos.includes(written.at(-1) ?? -1);
	if (stopped) written.pop();
	return {
		prompt,
		text: tokenizer.decode(written, { skip_special_tokens: true }).trim(),
		tokens: written.length,
		stopped
	};
}

type Progress = (file: string, loaded: number, total: number) => void;

const downloads = new Map<string, { done: Promise<void>; listeners: Set<Progress> }>();

/** Downloads a model's missing files into the cache; a second request joins the first. */
async function download(model: PinnedModel, onprogress: Progress): Promise<void> {
	let job = downloads.get(model.onnxId);
	if (!job) {
		const listeners = new Set<Progress>();
		const done = fetchFiles(model, (...p) => listeners.forEach((l) => l(...p))).finally(() =>
			downloads.delete(model.onnxId)
		);
		job = { done, listeners };
		downloads.set(model.onnxId, job);
	}
	const { done, listeners } = job;
	listeners.add(onprogress);
	try {
		await done;
	} finally {
		listeners.delete(onprogress);
	}
}

async function fetchFiles(model: PinnedModel, report: Progress): Promise<void> {
	const cache = await modelCache();
	if (!cache) throw new Error("This browser doesn't keep downloads");
	for (const path of Object.keys(model.onnxFiles)) {
		const url = pinnedUrl(model, path);
		const cached = await cache.match(url);
		if (cached) {
			const size = Number(cached.headers.get('content-length')) || 0;
			report(path, size, size);
			continue;
		}
		const response = await fetchPinned(url);
		if (!response.ok || !response.body) {
			throw new Error(`Couldn't download ${path} (HTTP ${response.status})`);
		}
		const total = Number(response.headers.get('content-length')) || 0;
		let loaded = 0;
		const counted = response.body.pipeThrough(
			new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					loaded += chunk.byteLength;
					report(path, loaded, total);
					controller.enqueue(chunk);
				}
			})
		);
		// The body errors at its end if its SHA-256 doesn't match, and then `put` stores nothing.
		const headers = total ? { 'content-length': String(total) } : undefined;
		try {
			await cache.put(url, new Response(counted, { headers }));
		} catch (error) {
			// Private windows keep the cache in memory and refuse a file as big as the Large model.
			if (error instanceof DOMException && error.name === 'UnknownError') {
				throw new Error(
					`This browser couldn't store ${path}; a private window may not have room for it`,
					{ cause: error }
				);
			}
			throw error;
		}
	}
}

let running: Promise<unknown> = Promise.resolve();

/** ONNX Runtime can't run a session twice at once, so model calls take turns. */
function inTurn<T>(run: () => Promise<T>): Promise<T> {
	const next = running.then(run, run);
	running = next.catch(() => {});
	return next;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	try {
		if (request.type === 'download') {
			const model = DOWNLOADS.find((m) => m.onnxId === request.model);
			if (!model) throw new Error(`${request.model} isn't a model this site downloads`);
			await download(model, (file, loaded, total) =>
				post({ id: request.id, type: 'progress', file, loaded, total })
			);
			post({ id: request.id, type: 'downloaded' });
		} else if (request.type === 'load') {
			const progress_callback = (p: {
				status: string;
				file?: string;
				loaded?: number;
				total?: number;
			}) => {
				if (p.status === 'progress' && p.file && p.total) {
					post({
						id: request.id,
						type: 'progress',
						file: p.file,
						loaded: p.loaded ?? 0,
						total: p.total
					});
				}
			};
			const options = {
				dtype: request.dtype,
				device: request.device,
				revision: request.revision,
				progress_callback,
				...(request.file ? { model_file_name: request.file } : {})
			};
			if (request.task === 'embed') {
				await once(
					extractors,
					request.model,
					() =>
						pipeline(
							'feature-extraction',
							request.model,
							options
						) as Promise<FeatureExtractionPipeline>
				);
			} else if (request.task === 'fill-mask') {
				await once(
					unmaskers,
					request.model,
					() => pipeline('fill-mask', request.model, options) as Promise<FillMaskPipeline>
				);
			} else if (request.task === 'image-text') {
				await once(textEncoders, request.model, async () => {
					const [tokenizer, model] = await Promise.all([
						AutoTokenizer.from_pretrained(request.model, {
							revision: request.revision,
							progress_callback
						}),
						CLIPTextModelWithProjection.from_pretrained(request.model, options)
					]);
					return { tokenizer, model };
				});
			} else if (request.task === 'chat') {
				await once(chatModels, request.model, async () => {
					const [tokenizer, model] = await Promise.all([
						AutoTokenizer.from_pretrained(request.model, {
							revision: request.revision,
							progress_callback
						}),
						AutoModelForCausalLM.from_pretrained(request.model, options)
					]);
					return { tokenizer, model };
				});
			} else {
				await once(causalModels, request.model, () =>
					AutoModelForCausalLM.from_pretrained(request.model, options)
				);
			}
			post({ id: request.id, type: 'loaded', device: request.device });
		} else if (request.type === 'embed') {
			const extractor = await extractors.get(request.model);
			if (!extractor) throw new Error('Model not loaded');
			const output = await inTurn(() =>
				extractor(request.texts, { pooling: 'mean', normalize: true })
			);
			post({ id: request.id, type: 'embedded', vectors: output.tolist() as number[][] });
		} else if (request.type === 'embed-text') {
			const encoder = await textEncoders.get(request.model);
			if (!encoder) throw new Error('Model not loaded');
			const inputs = encoder.tokenizer(request.texts, { padding: true, truncation: true });
			const { text_embeds } = (await inTurn(() => encoder.model(inputs))) as {
				text_embeds: Tensor;
			};
			const vectors = (text_embeds.tolist() as number[][]).map((v) => {
				const norm = Math.hypot(...v);
				return v.map((x) => x / norm);
			});
			post({ id: request.id, type: 'embedded', vectors });
		} else if (request.type === 'fill-mask') {
			const unmasker = await unmaskers.get(request.model);
			if (!unmasker) throw new Error('Model not loaded');
			const output = (await inTurn(() => unmasker(request.text, { top_k: request.topK }))) as {
				token: number;
				token_str: string;
				score: number;
			}[];
			post({
				id: request.id,
				type: 'filled',
				top: output.map((o) => ({ id: o.token, text: o.token_str, prob: o.score }))
			});
		} else if (request.type === 'next-token') {
			const model = await causalModels.get(request.model);
			if (!model) throw new Error('Model not loaded');
			post({
				id: request.id,
				type: 'distribution',
				...(await inTurn(() => nextToken(model, request.ids, request.topK)))
			});
		} else if (request.type === 'generate') {
			const chat = await chatModels.get(request.model);
			if (!chat) throw new Error('Model not loaded');
			post({ id: request.id, type: 'generated', ...(await inTurn(() => generate(chat, request))) });
		} else if (request.type === 'score') {
			const chat = await chatModels.get(request.model);
			const model = chat?.model ?? (await causalModels.get(request.model));
			if (!model) throw new Error('Model not loaded');
			const encode = (input: string | number[]) => {
				if (Array.isArray(input)) return input;
				if (!chat) throw new Error('This model takes token ids');
				return ids(chat.tokenizer(input, { add_special_tokens: false }).input_ids);
			};
			const p = await inTurn(() => score(model, encode(request.prompt), encode(request.answer)));
			post({ id: request.id, type: 'scored', p });
		}
	} catch (error) {
		post({
			id: request.id,
			type: 'error',
			message: error instanceof Error ? error.message : String(error)
		});
	}
};
