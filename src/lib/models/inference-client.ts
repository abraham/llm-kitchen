import type { WorkerRequest, WorkerResponse } from '#lib/workers/inference.worker.ts';
import InferenceWorker from '#lib/workers/inference.worker.ts?worker';

type Progress = Extract<WorkerResponse, { type: 'progress' }>;
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

type Pending = {
	resolve: (r: WorkerResponse) => void;
	reject: (e: Error) => void;
	onprogress?: (r: Progress) => void;
};

let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

/** Send one request to the shared inference worker (created on first use). */
export function send(
	request: WithoutId<WorkerRequest>,
	onprogress?: (r: Progress) => void
): Promise<WorkerResponse> {
	if (!worker) {
		worker = new InferenceWorker();
		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const r = event.data;
			const p = pending.get(r.id);
			if (!p) return;
			if (r.type === 'progress') return p.onprogress?.(r);
			pending.delete(r.id);
			if (r.type === 'error') p.reject(new Error(r.message));
			else p.resolve(r);
		};
	}
	const id = nextId++;
	return new Promise((resolve, reject) => {
		pending.set(id, { resolve, reject, onprogress });
		worker!.postMessage({ ...request, id } as WorkerRequest);
	});
}

export async function webgpuAvailable(): Promise<boolean> {
	const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
	if (!gpu) return false;
	try {
		return (await gpu.requestAdapter()) !== null;
	} catch {
		return false;
	}
}
