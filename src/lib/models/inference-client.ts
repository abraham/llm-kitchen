import type { WorkerRequest, WorkerResponse } from '#lib/workers/inference.worker.ts';
import InferenceWorker from '#lib/workers/inference.worker.ts?worker';
import { rpc } from '#lib/workers/rpc.ts';

/** Send one request to the shared inference worker (created on first use). */
export const send = rpc<WorkerRequest, WorkerResponse>(async () => new InferenceWorker());

export async function webgpuAvailable(): Promise<boolean> {
	const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
	if (!gpu) return false;
	try {
		return (await gpu.requestAdapter()) !== null;
	} catch {
		return false;
	}
}
