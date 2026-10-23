import { send, webgpuAvailable } from './inference-client.ts';

/** A model that runs in the visitor's browser (tier T2). Shown only after they agree to the download. */
export interface BrowserModelSpec {
	id: string;
	label: string;
	task: 'embed';
	/** Approximate one-time download, in MB, including the runtime. */
	downloadMB: number;
	modelMB: number;
	runtimeMB: number;
}

export const MINILM: BrowserModelSpec = {
	id: 'Xenova/all-MiniLM-L6-v2',
	label: 'all-MiniLM-L6-v2',
	task: 'embed',
	modelMB: 23,
	runtimeMB: 27,
	downloadMB: 50
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
			await send({ type: 'load', task: this.spec.task, model: this.spec.id, device }, (p) => {
				files[p.file] = { loaded: p.loaded, total: p.total };
				const all = Object.values(files);
				const total = all.reduce((a, f) => a + f.total, 0);
				this.status = {
					state: 'loading',
					fraction: total ? all.reduce((a, f) => a + f.loaded, 0) / total : null
				};
			});
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
}

const models: Record<string, BrowserModel> = {};

/** Shared instance per model, so consenting once covers every widget on the page. */
export function browserModel(spec: BrowserModelSpec): BrowserModel {
	return (models[spec.id] ??= new BrowserModel(spec));
}
