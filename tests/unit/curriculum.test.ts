// docs/spec/curriculum.md owns the organization; curriculum.ts must match its tables exactly.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';

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
	it('lists the same chapters, in the same Parts and order, as curriculum.ts', () => {
		const fromCode = CURRICULUM.map((c) => ({
			number: c.number,
			title: c.title,
			slug: c.slug,
			part: c.part.number ? `Part ${c.part.number} — ${c.part.title}` : c.part.title,
			buildsOn: c.buildsOn.map((s) => CURRICULUM.findIndex((x) => x.slug === s))
		}));
		expect(specRows()).toEqual(fromCode);
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

describe('src', () => {
	it('derives every chapter number, so moving a chapter only changes curriculum.ts', () => {
		const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) =>
			/\.(ts|svelte|svx)$/.test(f)
		);
		for (const f of files) {
			expect(readFileSync(`src/${f}`, 'utf8'), f).not.toMatch(/\bCh(apter)? \d/);
		}
	});
});
