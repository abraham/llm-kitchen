import embedder from '../../../models/embedder.json';
import { send, webgpuAvailable } from './inference-client.ts';
import { canonical } from './provider.ts';

/** A model that runs in the visitor's browser (tier T2). Shown only after they agree to the download. */
export interface BrowserModelSpec {
	id: string;
	revision: string;
	label: string;
	task: 'embed' | 'next-token';
	/** ONNX file to load instead of the default. */
	file?: string;
	/** Approximate one-time download of the model files, in MB; the runtime comes on top. */
	modelMB: number;
}

export const MINILM: BrowserModelSpec = {
	id: embedder.onnxId,
	revision: embedder.onnxRevision,
	label: embedder.displayName,
	task: 'embed',
	modelMB: embedder.onnxMB
};

/** The canonical small model, compressed to 8 bits. */
export const CANONICAL_LIVE: BrowserModelSpec = {
	id: canonical.onnxId,
	revision: canonical.onnxRevision,
	label: `${canonical.displayName} (8-bit)`,
	task: 'next-token',
	file: canonical.onnxFile,
	modelMB: canonical.onnxMB
};

export type ModelStatus =
	| { state: 'idle' }
	| { state: 'loading'; fraction: number | null }
	| { state: 'ready'; device: 'webgpu' | 'wasm' }
	| { state: 'error'; message: string };

/** One in-browser model, with reactive download/ready status for the consent UI. */
export class BrowserModel {
	status = $state<ModelStatus>({ state: 'idle' });
	readonly spec: BrowserModelSpec;

	constructor(spec: BrowserModelSpec) {
		this.spec = spec;
	}

	async load(): Promise<void> {
		if (this.status.state === 'ready' || this.status.state === 'loading') return;
		this.status = { state: 'loading', fraction: null };
		const files: Record<string, { loaded: number; total: number }> = {};
		try {
			const device = (await webgpuAvailable()) ? 'webgpu' : 'wasm';
			await send(
				{
					type: 'load',
					task: this.spec.task,
					model: this.spec.id,
					revision: this.spec.revision,
					device,
					file: this.spec.file
				},
				(p) => {
					files[p.file] = { loaded: p.loaded, total: p.total };
					const all = Object.values(files);
					const total = all.reduce((a, f) => a + f.total, 0);
					this.status = {
						state: 'loading',
						fraction: total ? all.reduce((a, f) => a + f.loaded, 0) / total : null
					};
				}
			);
			this.status = { state: 'ready', device };
		} catch (error) {
			this.status = {
				state: 'error',
				message: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async embed(texts: string[]): Promise<number[][]> {
		const r = await send({ type: 'embed', model: this.spec.id, texts });
		if (r.type !== 'embedded') throw new Error('Unexpected response from the model');
		return r.vectors;
	}

	/** Next-token probabilities after the token ids `ids`: the top `topK` and the rest. */
	async nextToken(
		ids: number[],
		topK: number
	): Promise<{ top: { id: number; prob: number }[]; rest: number }> {
		const r = await send({ type: 'next-token', model: this.spec.id, ids, topK });
		if (r.type !== 'distribution') throw new Error('Unexpected response from the model');
		return { top: r.top, rest: r.rest };
	}
}

const models: Record<string, BrowserModel> = {};

/** Shared instance per model, so consenting once covers every widget on the page. */
export function browserModel(spec: BrowserModelSpec): BrowserModel {
	return (models[spec.id] ??= new BrowserModel(spec));
}
