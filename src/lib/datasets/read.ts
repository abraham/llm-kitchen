import { readFileSync } from 'node:fs';
import { DATASETS, parseDataset, type DataOf, type DatasetId } from './registry.ts';

/** Read and parse a dataset from `static/data/` (tests and scripts, not the browser). */
export function readDataset<I extends DatasetId>(id: I): DataOf<I> {
	return parseDataset(id, JSON.parse(readFileSync(`static/data/${DATASETS[id].file}`, 'utf8')));
}
