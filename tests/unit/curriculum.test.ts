// docs/spec/curriculum.md owns the organization; meta.ts must match its tables exactly.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../../src/lib/chapters/meta.ts';

const spec = readFileSync('docs/spec/curriculum.md', 'utf8');
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

describe('docs/spec/curriculum.md', () => {
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

describe('docs/spec/chapters', () => {
	it('has one file per chapter, named by slug and headed with its title', () => {
		const files = readdirSync('docs/spec/chapters').sort();
		expect(files).toEqual(CURRICULUM.map((c) => `${c.slug}.md`).sort());
		for (const c of CURRICULUM) {
			const text = readFileSync(`docs/spec/chapters/${c.slug}.md`, 'utf8');
			expect(text.split('\n')[0], c.slug).toBe(`# ${c.title}`);
		}
	});

	it('leaves chapter numbers to curriculum.md, so moving a chapter changes no other spec', () => {
		const files = readdirSync('docs/spec', { recursive: true, encoding: 'utf8' }).filter(
			(f) => f.endsWith('.md') && f !== 'curriculum.md'
		);
		for (const f of files) {
			expect(readFileSync(`docs/spec/${f}`, 'utf8'), f).not.toMatch(/\bCh \d/);
		}
	});
});
