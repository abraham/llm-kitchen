// docs/CURRICULUM.md owns the organization; meta.ts must match its tables exactly.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../../src/lib/chapters/meta.ts';

const spec = readFileSync('docs/CURRICULUM.md', 'utf8');
const organization = spec.slice(
	spec.indexOf('## The organization'),
	spec.indexOf('## Why this order')
);

function specRows() {
	const rows: { number: number; title: string; slug: string; part: string; buildsOn: number[] }[] =
		[];
	let part = '';
	for (const line of organization.split('\n')) {
		part = line.match(/^### (.+)$/)?.[1] ?? part;
		const row = line.match(/^\| (\d+)\s*\| (.+?)\s*\| `([^`]+)`\s*\| (.+?)\s*\|$/);
		if (row) {
			const builds = row[4] === '—' ? [] : row[4].split(',').map((n) => Number(n.trim()));
			rows.push({ number: Number(row[1]), title: row[2], slug: row[3], part, buildsOn: builds });
		}
	}
	return rows;
}

describe('docs/CURRICULUM.md', () => {
	it('lists the same chapters, in the same Parts and order, as meta.ts', () => {
		const fromMeta = CURRICULUM.map((c) => ({
			number: c.number,
			title: c.title,
			slug: c.slug,
			part: c.part.number ? `Part ${c.part.number} — ${c.part.title}` : c.part.title,
			buildsOn: c.buildsOn
		}));
		expect(specRows()).toEqual(fromMeta);
	});
});
