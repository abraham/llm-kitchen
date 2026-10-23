import { loadDataset } from '#lib/datasets/load.ts';
import type { TraceName } from '#lib/datasets/registry.ts';
import type { Trace } from './trace.ts';

/** A recorded trace of the canonical model, by name. */
export function loadTrace(name: TraceName): Promise<Trace> {
	return loadDataset(`traces/${name}`);
}
