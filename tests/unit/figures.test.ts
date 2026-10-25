import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = 'src/lib';
const svelte = readdirSync(dir, { recursive: true, encoding: 'utf8' })
	.filter((f) => f.endsWith('.svelte'))
	.map((file) => ({ file, source: readFileSync(`${dir}/${file}`, 'utf8') }));

describe('figures (docs/spec/visualizations.md)', () => {
	it('name every SVG for screen readers, or hide it', () => {
		const unnamed = svelte.flatMap(({ file, source }) =>
			(source.match(/<svg\b[^>]*>/g) ?? [])
				.filter((tag) => !/aria-hidden="true"/.test(tag))
				.filter((tag) => !(/role="img"/.test(tag) && /aria-label=/.test(tag)))
				.map((tag) => `${file}: ${tag.slice(0, 60)}`)
		);
		expect(unnamed).toEqual([]);
	});

	it('draw chapter figures through Figure, which names them and keeps their text readable', () => {
		const raw = svelte.filter(
			({ file, source }) => file.startsWith('chapters/') && /<svg\b/.test(source)
		);
		expect(raw.map((f) => f.file)).toEqual([]);
	});

	it('read reduced motion through the motion store', () => {
		const direct = svelte.filter(({ source }) =>
			/prefersReducedMotion|prefers-reduced-motion/.test(source)
		);
		expect(direct.map((f) => f.file)).toEqual([]);
	});
});
