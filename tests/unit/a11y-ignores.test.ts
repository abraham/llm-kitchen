import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every `svelte-ignore a11y_*` in src/, with why it's safe. A new one fails until it's added here. */
const ALLOWED: Record<string, { codes: string[]; reason: string }> = {
	'src/lib/chapters/seeing-pictures/PatchCutter.svelte': {
		codes: ['a11y_click_events_have_key_events', 'a11y_no_static_element_interactions'],
		reason:
			'A click on the picture picks a patch; the Patch slider does the same from the keyboard.'
	}
};

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sources(path);
		return /\.(svelte|svx)$/.test(entry.name) ? [path] : [];
	});
}

describe('Svelte accessibility warnings', () => {
	it('are ignored only where the allowlist says why', () => {
		const found: Record<string, string[]> = {};
		for (const file of sources('src')) {
			for (const [, list] of readFileSync(file, 'utf8').matchAll(/svelte-ignore\s+([\w\s,]+)/g)) {
				const codes = list.split(/[\s,]+/).filter((code) => code.startsWith('a11y_'));
				if (codes.length) (found[file] ??= []).push(...codes);
			}
		}
		const allowed = Object.fromEntries(
			Object.entries(ALLOWED).map(([file, { codes }]) => [file, codes])
		);
		expect(found).toEqual(allowed);
		for (const { reason } of Object.values(ALLOWED)) expect(reason).not.toBe('');
	});
});
