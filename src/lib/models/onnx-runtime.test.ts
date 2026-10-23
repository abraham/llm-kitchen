import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { RUNTIME_MB, runtimeBuild } from './onnx-runtime.ts';

const require = createRequire(import.meta.url);
const mb = (file: string) => Math.round(readFileSync(require.resolve(file)).length / 1e6);

describe('ONNX Runtime download sizes', () => {
	it('match the WebAssembly files the worker bundles', () => {
		expect(mb('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm')).toBe(RUNTIME_MB.asyncify);
		expect(mb('onnxruntime-web/ort-wasm-simd-threaded.wasm')).toBe(RUNTIME_MB.plain);
	});

	it('picks the plain build only for Safari without WebGPU', () => {
		const safari =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
		const chrome =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
		expect(runtimeBuild({ userAgent: safari })).toBe('plain');
		expect(runtimeBuild({ userAgent: safari, gpu: {} } as { userAgent: string })).toBe('asyncify');
		expect(runtimeBuild({ userAgent: chrome })).toBe('asyncify');
	});
});
