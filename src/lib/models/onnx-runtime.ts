/** ONNX Runtime's two WebAssembly builds, bundled with the site, and their download size in MB. */
export const RUNTIME_MB = { asyncify: 27, plain: 14 } as const;

export type RuntimeBuild = keyof typeof RUNTIME_MB;

/** Same choice Transformers.js makes: Safari without WebGPU needs the non-asyncify build. */
export function runtimeBuild(nav: { userAgent: string }): RuntimeBuild {
	return /^((?!chrome|android).)*safari/i.test(nav.userAgent) && !('gpu' in nav)
		? 'plain'
		: 'asyncify';
}
