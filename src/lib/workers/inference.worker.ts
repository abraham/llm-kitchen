/// <reference lib="webworker" />
// Runs Transformers.js models off the main thread. Messages: see BrowserModel in
// src/lib/models/browser-model.svelte.ts.
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
// ONNX Runtime's WebAssembly files are bundled as hashed assets of this site (instead of the default
// CDN), so they get long-lived caching and the page CSP can stay 'self'.
import asyncifyMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import asyncifyWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import plainMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import plainWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';

env.allowLocalModels = false;
// Same choice Transformers.js makes: Safari without WebGPU needs the non-asyncify build.
const isOldSafari =
	/^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !('gpu' in navigator);
const abs = (url: string) => new URL(url, self.location.href).href;
if (env.backends.onnx.wasm) {
	env.backends.onnx.wasm.wasmPaths = isOldSafari
		? { mjs: abs(plainMjs), wasm: abs(plainWasm) }
		: { mjs: abs(asyncifyMjs), wasm: abs(asyncifyWasm) };
}

export type WorkerRequest =
	| { id: number; type: 'load'; task: 'embed'; model: string; device: 'webgpu' | 'wasm' }
	| { id: number; type: 'embed'; model: string; texts: string[] };

export type WorkerResponse =
	| { id: number; type: 'progress'; file: string; loaded: number; total: number }
	| { id: number; type: 'loaded'; device: 'webgpu' | 'wasm' }
	| { id: number; type: 'embedded'; vectors: number[][] }
	| { id: number; type: 'error'; message: string };

const extractors = new Map<string, Promise<FeatureExtractionPipeline>>();

function post(message: WorkerResponse) {
	self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	try {
		if (request.type === 'load') {
			let pending = extractors.get(request.model);
			if (!pending) {
				pending = pipeline('feature-extraction', request.model, {
					dtype: 'q8',
					device: request.device,
					progress_callback: (p: {
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
					}
				}) as Promise<FeatureExtractionPipeline>;
				extractors.set(request.model, pending);
				pending.catch(() => extractors.delete(request.model));
			}
			await pending;
			post({ id: request.id, type: 'loaded', device: request.device });
		} else if (request.type === 'embed') {
			const extractor = await extractors.get(request.model);
			if (!extractor) throw new Error('Model not loaded');
			const output = await extractor(request.texts, { pooling: 'mean', normalize: true });
			post({ id: request.id, type: 'embedded', vectors: output.tolist() as number[][] });
		}
	} catch (error) {
		post({
			id: request.id,
			type: 'error',
			message: error instanceof Error ? error.message : String(error)
		});
	}
};
