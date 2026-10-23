import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { RUNTIME_MB } from './onnx-runtime.ts';

const require = createRequire(import.meta.url);
const mb = (file: string) => Math.round(readFileSync(require.resolve(file)).length / 1e6);

describe('ONNX Runtime download size', () => {
	it('matches the WebAssembly file the worker bundles', () => {
		expect(mb('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm')).toBe(RUNTIME_MB);
	});
});
