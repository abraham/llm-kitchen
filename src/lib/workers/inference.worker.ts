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
import plainMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import plainWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { runtimeBuild } from '#lib/models/onnx-runtime.ts';

env.allowLocalModels = false;
const abs = (url: string) => new URL(url, self.location.href).href;
if (env.backends.onnx.wasm) {
	env.backends.onnx.wasm.wasmPaths =
		runtimeBuild(navigator) === 'plain'
			? { mjs: abs(plainMjs), wasm: abs(plainWasm) }
			: { mjs: abs(asyncifyMjs), wasm: abs(asyncifyWasm) };
}

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
	| { id: number; type: 'embed'; model: string; texts: string[] }
	| { id: number; type: 'next-token'; model: string; ids: number[]; topK: number };

export type WorkerResponse =
	| { id: number; type: 'progress'; file: string; loaded: number; total: number }
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	try {
		if (request.type === 'load') {
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
