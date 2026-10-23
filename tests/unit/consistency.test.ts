// Cross-chapter consistency for the final fact review: every GPT-2 number written into the prose
// must match models/canonical.json, so switching the canonical model flags each one to update.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';

const dir = 'src/lib/chapters';
const chapters = readdirSync(dir)
	.filter((f) => f.endsWith('.svx'))
	.map((f) => ({ file: f, text: readFileSync(`${dir}/${f}`, 'utf8').replace(/\s+/g, ' ') }));

/** Phrases the chapters use for canonical-model facts, and the value each must match. */
const FACTS: [RegExp, number, string][] = [
	[/\b50,257\b/g, canonical.vocabularySize, 'vocabularySize'],
	[/\b1,024\b/g, canonical.contextLength, 'contextLength'],
	[/\b768\b/g, canonical.embeddingSize, 'embeddingSize'],
	[/\b3,072\b/g, canonical.mlpSize, 'mlpSize'],
	[/\b124 million\b/g, Math.round(canonical.parameters / 1e6) * 1e6, 'parameters (rounded)'],
	[/\b12 (?:layers|blocks)\b/g, canonical.layers, 'layers'],
	[/\b12 heads\b/g, canonical.heads, 'heads']
];

describe('GPT-2 numbers in the prose match models/canonical.json', () => {
	for (const [pattern, value, field] of FACTS) {
		it(`${pattern.source} → ${field}`, () => {
			const used = chapters.filter((c) => pattern.test(c.text)).map((c) => c.file);
			pattern.lastIndex = 0;
			const written = Number(pattern.source.match(/\d[\d,]*/)![0].replaceAll(',', ''));
			const expected = field.startsWith('parameters') ? written * 1e6 : written;
			// Only chapters that mention the number constrain it.
			expect(used.length ? value : expected, used.join(', ')).toBe(expected);
		});
	}

	it('uses the canonical display name, not a different GPT-2 size', () => {
		for (const c of chapters) {
			expect(c.text, c.file).not.toMatch(/GPT-2 (medium|large|XL)\b/);
		}
	});
});
