import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import { readDataset } from '../../src/lib/datasets/read.ts';
import { DATASETS, type DatasetId, type TraceName } from '../../src/lib/datasets/registry.ts';

const ids = Object.keys(DATASETS) as DatasetId[];
const files = readdirSync('static/data', { recursive: true, encoding: 'utf8' }).filter((f) =>
	f.endsWith('.json')
);
const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
	.filter((f) => /\.(svelte|svx|ts)$/.test(f) && !/\.(test|e2e)\.ts$/.test(f))
	.map((f) => readFileSync(`src/${f}`, 'utf8'))
	.join('\n');

describe('recorded datasets', () => {
	it('has a registry entry for every file in static/data, and a file for every entry', () => {
		expect(files.sort()).toEqual(ids.map((id) => DATASETS[id].file).sort());
	});

	it.each(ids)('%s parses, with its envelope and models', (id) => {
		expect(() => readDataset(id)).not.toThrow();
		const head = JSON.parse(readFileSync(`static/data/${DATASETS[id].file}`, 'utf8'));
		expect(head.script).toBe(`record/${DATASETS[id].script}.py`);
		expect(head.models.length).toBeGreaterThan(0);
	});

	it('every dataset is used by the site', () => {
		const traceNames = (ids.filter((id) => id.startsWith('traces/')) as string[]).map((id) =>
			id.slice('traces/'.length)
		);
		for (const id of ids) {
			const name = id.split('/').at(-1)!;
			const used =
				sources.includes(`'${id}'`) ||
				sources.includes(`\`${id}\``) ||
				(traceNames.includes(name) && sources.includes(`'${name}'`)) ||
				(id.startsWith('agent/') && sources.includes(`'${name}'`));
			expect(used, id).toBe(true);
		}
	});

	it('keeps the data each chapter loads for its first view under 100 KB gzipped', () => {
		for (const c of CURRICULUM) {
			let chapterTs = '';
			try {
				chapterTs = readFileSync(`src/lib/chapters/${c.slug}/chapter.ts`, 'utf8');
			} catch {
				continue;
			}
			const listed = ids.filter((id) => chapterTs.includes(`'${id}'`));
			const bytes = listed.reduce(
				(sum, id) => sum + gzipSync(readFileSync(`static/data/${DATASETS[id].file}`)).length,
				0
			);
			expect(bytes / 1024, c.slug).toBeLessThan(100);
		}
	});
});

describe('recorded traces', () => {
	const traces = ids.filter((id) => id.startsWith('traces/')) as `traces/${TraceName}`[];

	it.each(traces)('%s comes from the canonical model', (id) => {
		const trace = readDataset(id);
		expect(trace.kind).toBe('recorded');
		expect(trace.model).toBe(canonical.id);
		expect(trace.modelDisplayName).toBe(canonical.displayName);
		for (const step of trace.steps) {
			for (const c of step.candidates) expect(c.token.id).toBeLessThan(canonical.vocabularySize);
		}
	});

	it('greedy decoding picks the most likely candidate at every step', () => {
		for (const step of readDataset('traces/the-cat-sat').steps) {
			expect(step.chosen.id).toBe(step.candidates[0].token.id);
		}
	});

	it('sampling at temperature 0 matches greedy decoding', () => {
		const greedy = readDataset('traces/the-cat-sat').steps.map((s) => s.chosen.id);
		const t0 = readDataset('traces/the-cat-sat-t00').steps.map((s) => s.chosen.id);
		expect(t0.slice(0, greedy.length)).toEqual(greedy);
	});
});
