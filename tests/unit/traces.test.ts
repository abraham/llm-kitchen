import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';
import { parseTrace } from '../../src/lib/models/trace.ts';

const dir = `static/traces/${canonical.id}`;
const names = readdirSync(dir)
	.filter((f) => f.endsWith('.json') && f !== 'index.json')
	.map((f) => f.slice(0, -5));
const load = (name: string) => parseTrace(JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8')));

describe('recorded traces', () => {
	it('are listed in index.json', () => {
		const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8')) as { traces: string[] };
		expect(index.traces.sort()).toEqual([...names].sort());
	});

	it.each(names)('%s is a valid recorded trace from the canonical model', (name) => {
		const trace = load(name);
		expect(trace.kind).toBe('recorded');
		expect(trace.model).toBe(canonical.id);
		expect(trace.modelDisplayName).toBe(canonical.displayName);
		for (const step of trace.steps) {
			for (const c of step.candidates) expect(c.token.id).toBeLessThan(canonical.vocabularySize);
		}
	});

	it('greedy decoding picks the most likely candidate at every step', () => {
		const trace = load('the-cat-sat');
		for (const step of trace.steps) expect(step.chosen.id).toBe(step.candidates[0].token.id);
	});

	it('sampling at temperature 0 matches greedy decoding', () => {
		const greedy = load('the-cat-sat').steps.map((s) => s.chosen.id);
		const t0 = load('the-cat-sat-t00').steps.map((s) => s.chosen.id);
		expect(t0.slice(0, greedy.length)).toEqual(greedy);
	});
});
