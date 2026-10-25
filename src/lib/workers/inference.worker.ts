/// <reference lib="webworker" />
// Runs Transformers.js models off the main thread. Messages: see BrowserModel in
// src/lib/models/browser-model.svelte.ts.
import {
	AutoModelForCausalLM,
	env,
	pipeline,
	Tensor,
	type FeatureExtractionPipeline,
	type PreTrainedModel
} from '@huggingface/transformers';
// ONNX Runtime's WebAssembly files are bundled as hashed assets of this site (instead of the default
// CDN), so they get long-lived caching and the page CSP can stay 'self'.
import asyncifyMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import asyncifyWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import { DOWNLOADS } from '#lib/models/downloads.ts';
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
			task: 'embed' | 'next-token';
			model: string;
			/** Hugging Face commit to download, so the files can't change under the site. */
			revision: string;
			device: 'webgpu' | 'wasm';
			/** ONNX file to load instead of the default, without the dtype suffix. */
			file?: string;
	  }
	| { id: number; type: 'download'; model: string }
	| { id: number; type: 'embed'; model: string; texts: string[] }
	| { id: number; type: 'next-token'; model: string; ids: number[]; topK: number };

export type WorkerResponse =
	| { id: number; type: 'progress'; file: string; loaded: number; total: number }
	| { id: number; type: 'downloaded' }
	| { id: number; type: 'loaded'; device: 'webgpu' | 'wasm' }
	| { id: number; type: 'embedded'; vectors: number[][] }
	| { id: number; type: 'distribution'; top: { id: number; prob: number }[]; rest: number }
	| { id: number; type: 'error'; message: string };

const extractors = new Map<string, Promise<FeatureExtractionPipeline>>();
const causalModels = new Map<string, Promise<PreTrainedModel>>();

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
		await cache.put(url, new Response(counted, { headers }));
	}
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
				dtype: 'q8' as const,
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
			} else {
				await once(causalModels, request.model, () =>
					AutoModelForCausalLM.from_pretrained(request.model, options)
				);
			}
			post({ id: request.id, type: 'loaded', device: request.device });
		} else if (request.type === 'embed') {
			const extractor = await extractors.get(request.model);
			if (!extractor) throw new Error('Model not loaded');
			const output = await extractor(request.texts, { pooling: 'mean', normalize: true });
			post({ id: request.id, type: 'embedded', vectors: output.tolist() as number[][] });
		} else if (request.type === 'next-token') {
			const model = await causalModels.get(request.model);
			if (!model) throw new Error('Model not loaded');
			post({
				id: request.id,
				type: 'distribution',
				...(await nextToken(model, request.ids, request.topK))
			});
		}
	} catch (error) {
		post({
			id: request.id,
			type: 'error',
			message: error instanceof Error ? error.message : String(error)
		});
	}
};
