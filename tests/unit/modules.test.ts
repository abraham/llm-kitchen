import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
	.filter((f) => /\.(ts|js|svelte)$/.test(f))
	.map((f) => ({ file: f, source: readFileSync(`src/${f}`, 'utf8') }));

describe('modules', () => {
	// A module namespace with `then` is a thenable: Vite's dev SSR calls it and the page fails with 500.
	it('never export a binding named then', () => {
		const pattern =
			/export\s+(async\s+)?(function\*?|const|let|var|class)\s+then\b|export\s*\{[^}]*\bthen\b/;
		expect(sources.filter((s) => pattern.test(s.source)).map((s) => s.file)).toEqual([]);
	});
});
