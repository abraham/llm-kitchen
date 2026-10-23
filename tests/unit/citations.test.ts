import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import references from '../../src/lib/references.json';

function files(dir: string, ext: RegExp): string[] {
	return readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((f) => ext.test(f))
		.map((f) => join(dir, f));
}

const sources = [
	...files('src/lib/chapters', /\.svx$/),
	...files('src/lib/components', /\.svelte$/)
];
const cited = new Map<string, string[]>();
for (const file of sources) {
	for (const [, id] of readFileSync(file, 'utf8').matchAll(/<Cite\s+id="([^"]+)"/g)) {
		cited.set(id, [...(cited.get(id) ?? []), file]);
	}
}

describe('citations', () => {
	const ids = references.map((r) => r.id);

	it('has unique ids and complete entries with https URLs', () => {
		expect(new Set(ids).size).toBe(ids.length);
		for (const ref of references) {
			expect(ref.authors.length, ref.id).toBeGreaterThan(0);
			expect(ref.title, ref.id).toBeTruthy();
			expect(ref.venue, ref.id).toBeTruthy();
			expect(ref.year, ref.id).toBeGreaterThan(1800);
			expect(ref.url, ref.id).toMatch(/^https:\/\//);
		}
	});

	it('only cites ids that exist in references.json', () => {
		const unknown = [...cited.keys()].filter((id) => !ids.includes(id));
		expect(unknown).toEqual([]);
	});

	it('cites every entry in references.json somewhere', () => {
		const unused = ids.filter((id) => !cited.has(id));
		expect(unused).toEqual([]);
	});
});
