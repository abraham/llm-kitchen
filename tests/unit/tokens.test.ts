import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/tokens.css', 'utf8');

const light: Record<string, string> = {};
const dark: Record<string, string> = {};
for (const [, name, a, b] of css.matchAll(
	/--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\);/gi
)) {
	light[name] = a;
	dark[name] = b;
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const concepts = ['token', 'vector', 'weight', 'attention', 'prob', 'loss', 'harness'];

describe.each([
	['light', light],
	['dark', dark]
])('%s theme', (_, theme) => {
	it('defines every concept color', () => {
		for (const c of concepts) {
			for (const suffix of ['', '-ink', '-tint']) expect(theme[`c-${c}${suffix}`]).toBeDefined();
		}
	});

	it('body and muted text pass WCAG AA on the page and surfaces', () => {
		for (const bg of ['page', 'surface', 'surface-2']) {
			expect(contrast(theme.ink, theme[bg])).toBeGreaterThanOrEqual(7);
			expect(contrast(theme['ink-muted'], theme[bg])).toBeGreaterThanOrEqual(4.5);
		}
	});

	it.each(concepts)('%s ink passes AA on the page, surface, and its tint', (c) => {
		const ink = theme[`c-${c}-ink`];
		for (const bg of [theme.page, theme.surface, theme[`c-${c}-tint`]]) {
			expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5);
		}
	});

	it.each(concepts)('%s fill is visible against the page (3:1 for graphics)', (c) => {
		expect(contrast(theme[`c-${c}`], theme.page)).toBeGreaterThanOrEqual(3);
	});
});
