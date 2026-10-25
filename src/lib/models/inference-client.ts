import type { WorkerRequest, WorkerResponse } from '#lib/workers/inference.worker.ts';
import InferenceWorker from '#lib/workers/inference.worker.ts?worker';
import { rpc } from '#lib/workers/rpc.ts';

/** In the end-to-end build, this localStorage key swaps in a fake worker that downloads nothing. */
export const FAKE_INFERENCE = 'llm-kitchen:fake-inference';

const fakes: Record<string, () => Promise<new () => Worker>> = import.meta.env.VITE_FIXTURES
	? import.meta.glob<new () => Worker>('/tests/e2e/fixtures/fake-inference.worker.ts', {
			query: '?worker',
			import: 'default'
		})
	: {};

async function createWorker(): Promise<Worker> {
	const fake = Object.values(fakes)[0];
	if (fake && globalThis.localStorage?.getItem(FAKE_INFERENCE)) return new (await fake())();
	return new InferenceWorker();
}

/** Send one request to the shared inference worker (created on first use). */
export const send = rpc<WorkerRequest, WorkerResponse>(createWorker);

export async function webgpuAvailable(): Promise<boolean> {
	const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
	if (!gpu) return false;
	try {
		return (await gpu.requestAdapter()) !== null;
	} catch {
		return false;
	}
}
